"""
document_service.py — Business logic for document management.

Handles:
  - Saving uploaded PDF files to disk
  - Creating document metadata records in PostgreSQL
  - Retrieving, filtering, and deleting documents
"""
import logging
import os
import uuid
from typing import List, Optional

from fastapi import HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.document import Document, DocumentType
from app.models.user import User

logger = logging.getLogger(__name__)

# Allowed MIME types for uploaded files
ALLOWED_CONTENT_TYPES = {"application/pdf"}
MAX_FILE_BYTES = settings.MAX_FILE_SIZE_MB * 1024 * 1024


def _ensure_upload_dir() -> str:
    """Create the uploads directory if it doesn't exist. Returns path."""
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    return settings.UPLOAD_DIR


def upload_document(
    db: Session,
    file: UploadFile,
    title: str,
    company_name: str,
    document_type: DocumentType,
    current_user: User,
) -> Document:
    """
    Save an uploaded PDF to disk and record its metadata in the database.

    Steps:
      1. Validate file type and size
      2. Generate a unique filename to avoid collisions
      3. Write file bytes to disk
      4. Save document metadata to PostgreSQL

    :raises HTTPException 400: if file is not a PDF or exceeds size limit
    """
    # 1. Validate file type
    if file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Only PDF files are allowed. Got: {file.content_type}",
        )

    # 2. Read file content and validate size
    content = file.file.read()
    if len(content) > MAX_FILE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File size exceeds {settings.MAX_FILE_SIZE_MB}MB limit",
        )

    # 3. Generate a unique filename to prevent overwriting existing files
    ext = os.path.splitext(file.filename or "document.pdf")[1] or ".pdf"
    unique_name = f"{uuid.uuid4().hex}{ext}"
    upload_dir = _ensure_upload_dir()
    file_path = os.path.join(upload_dir, unique_name)

    # Write file to disk
    with open(file_path, "wb") as f:
        f.write(content)

    logger.info(f"File saved: {file_path} ({len(content)} bytes)")

    # 4. Save metadata to database
    doc = Document(
        title=title,
        company_name=company_name,
        document_type=document_type,
        file_path=file_path,
        file_name=file.filename or unique_name,
        uploaded_by=current_user.id,
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)

    logger.info(f"Document created: id={doc.id}, title='{doc.title}'")
    return doc


def get_all_documents(db: Session) -> List[Document]:
    """Return all documents ordered by newest first."""
    return db.query(Document).order_by(Document.created_at.desc()).all()


def get_document_by_id(db: Session, document_id: int) -> Document:
    """
    Fetch a single document by ID.
    :raises HTTPException 404: if not found
    """
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Document {document_id} not found",
        )
    return doc


def delete_document(db: Session, document_id: int) -> dict:
    """
    Delete a document's database record and its file from disk.
    :raises HTTPException 404: if not found
    """
    doc = get_document_by_id(db, document_id)

    # Delete the physical file from disk (ignore if already missing)
    if os.path.exists(doc.file_path):
        os.remove(doc.file_path)
        logger.info(f"Deleted file: {doc.file_path}")

    db.delete(doc)
    db.commit()
    logger.info(f"Document {document_id} deleted from database")
    return {"message": f"Document {document_id} deleted successfully"}


def search_documents(
    db: Session,
    title: Optional[str] = None,
    company_name: Optional[str] = None,
    document_type: Optional[DocumentType] = None,
) -> List[Document]:
    """
    Search documents by metadata using SQL ILIKE (case-insensitive LIKE).

    All filters are optional — any combination can be used.
    """
    query = db.query(Document)

    if title:
        # ILIKE is PostgreSQL's case-insensitive LIKE
        query = query.filter(Document.title.ilike(f"%{title}%"))
    if company_name:
        query = query.filter(Document.company_name.ilike(f"%{company_name}%"))
    if document_type:
        query = query.filter(Document.document_type == document_type)

    return query.order_by(Document.created_at.desc()).all()
