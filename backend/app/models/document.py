"""
document.py — Document ORM model.
"""
from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Enum
from sqlalchemy.orm import relationship
import enum

from app.db.base import Base


class DocumentType(str, enum.Enum):
    invoice = "invoice"
    report = "report"
    contract = "contract"
    agreement = "agreement"
    other = "other"


class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(500), nullable=False, index=True)
    company_name = Column(String(255), nullable=False, index=True)
    document_type = Column(
        Enum(DocumentType),
        nullable=False,
        default=DocumentType.other,
    )
    file_path = Column(String(1000), nullable=False)
    file_name = Column(String(500), nullable=False)
    uploaded_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    status = Column(String(50), default="uploaded", nullable=False)
    chunks_count = Column(Integer, default=0, nullable=False)

    uploader = relationship("User", back_populates="documents")

    def __repr__(self) -> str:
        return f"<Document {self.title} ({self.document_type})>"