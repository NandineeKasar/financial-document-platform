"""
endpoints/documents.py — Financial document management routes.

POST   /documents/upload       — Upload a PDF (Analyst, Admin)
GET    /documents              — List all documents (all authenticated users)
GET    /documents/search       — Search by metadata (all authenticated users)
GET    /documents/{id}         — Get document details (all authenticated users)
DELETE /documents/{id}         — Delete document (Admin only)
"""
import logging
from typing import List, Optional

from fastapi import APIRouter, Depends, File, Form, UploadFile, Query
from sqlalchemy.orm import Session

from app.core.dependencies import get_db, get_current_user, require_roles
from app.models.document import DocumentType
from app.models.user import User
from app.schemas.document import DocumentResponse, DocumentSearchParams
from app.services.document_service import (
    upload_document,
    get_all_documents,
    get_document_by_id,
    delete_document,
    search_documents,
)

router = APIRouter(prefix="/documents", tags=["Documents"])
logger = logging.getLogger(__name__)


@router.post(
    "/upload",
    response_model=DocumentResponse,
    status_code=201,
    summary="Upload a financial PDF document",
    description="Upload a PDF file with metadata. Only Analysts and Admins can upload.",
)
def upload(
    file: UploadFile = File(..., description="PDF file to upload"),
    title: str = Form(..., description="Document title"),
    company_name: str = Form(..., description="Company the document belongs to"),
    document_type: DocumentType = Form(..., description="Type: invoice, report, contract, agreement, other"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["Financial Analyst", "Admin"])),
):
    """
    multipart/form-data endpoint because we're uploading a file AND JSON-like fields.
    FastAPI handles this automatically with File() and Form() annotations.
    """
    return upload_document(db, file, title, company_name, document_type, current_user)


@router.get(
    "",
    response_model=List[DocumentResponse],
    summary="List all documents",
)
def list_documents(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),  # Any authenticated user can view
):
    return get_all_documents(db)


@router.get(
    "/search",
    response_model=List[DocumentResponse],
    summary="Search documents by metadata",
    description="Filter documents by title, company name, or document type.",
)
def search(
    title: Optional[str] = Query(None, description="Search in document title"),
    company_name: Optional[str] = Query(None, description="Filter by company name"),
    document_type: Optional[DocumentType] = Query(None, description="Filter by document type"),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """
    NOTE: This route MUST be defined before /{document_id} to avoid
    FastAPI treating "search" as a document ID.
    """
    return search_documents(db, title, company_name, document_type)


@router.get(
    "/{document_id}",
    response_model=DocumentResponse,
    summary="Get a single document by ID",
)
def get_document(
    document_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return get_document_by_id(db, document_id)


@router.delete(
    "/{document_id}",
    summary="Delete a document (Admin only)",
    description="Permanently deletes the document record and its file from disk.",
)
def delete(
    document_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(["Admin"])),
):
    return delete_document(db, document_id)
