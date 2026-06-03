"""schemas/document.py — Pydantic schemas for document management."""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel

from app.models.document import DocumentType


class DocumentResponse(BaseModel):
    id: int
    title: str
    company_name: str
    document_type: DocumentType
    file_name: str
    uploaded_by: int
    created_at: datetime
    status: Optional[str] = "uploaded"
    chunks_count: Optional[int] = 0

    model_config = {"from_attributes": True}


class DocumentSearchParams(BaseModel):
    title: Optional[str] = None
    company_name: Optional[str] = None
    document_type: Optional[DocumentType] = None