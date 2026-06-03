"""
endpoints/rag.py — RAG pipeline routes.

POST   /rag/index-document           — Index a document into Qdrant
DELETE /rag/remove-document/{id}     — Remove document vectors from Qdrant
POST   /rag/search                   — Semantic search with reranking
GET    /rag/context/{document_id}    — Retrieve all chunks for a document
"""
import logging

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_db, get_current_user, require_roles
from app.models.user import User
from app.schemas.rag import SearchRequest, SearchResponse, IndexResponse, ContextResponse, ChunkResult
from app.services.document_service import get_document_by_id
from app.services.rag_service import get_rag_service, RAGService

router = APIRouter(prefix="/rag", tags=["RAG Pipeline"])
logger = logging.getLogger(__name__)


@router.post(
    "/index-document",
    response_model=IndexResponse,
    summary="Index a document into the vector database",
    description="Extracts text from the PDF, chunks it, creates embeddings, and stores in Qdrant.",
)
def index_document(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["Financial Analyst", "Admin"])),
    rag: RAGService = Depends(get_rag_service),
):
    """
    Trigger indexing for an already-uploaded document.

    The document must already exist in PostgreSQL (uploaded via /documents/upload).
    This step separately handles the AI processing pipeline.
    """
    doc = get_document_by_id(db, document_id)  # Raises 404 if not found

    chunks_count = rag.index_document(
        document_id=doc.id,
        file_path=doc.file_path,
        title=doc.title,
        company_name=doc.company_name,
    )

    return IndexResponse(
        document_id=doc.id,
        chunks_indexed=chunks_count,
        message=f"Successfully indexed {chunks_count} chunks for document '{doc.title}'",
    )


@router.delete(
    "/remove-document/{document_id}",
    summary="Remove document embeddings from vector database",
)
def remove_document_embeddings(
    document_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(["Admin"])),
    rag: RAGService = Depends(get_rag_service),
):
    """Remove all Qdrant vectors associated with a document."""
    get_document_by_id(db, document_id)  # Verify document exists
    rag.remove_document(document_id)
    return {"message": f"Embeddings for document {document_id} removed from vector database"}


@router.post(
    "/search",
    response_model=SearchResponse,
    summary="Semantic search across all indexed documents",
    description="""
    Two-stage retrieval:
    1. Embed the query and retrieve top 20 candidates from Qdrant (fast vector search)
    2. Rerank using cross-encoder model (ms-marco-MiniLM) for precision
    3. Return top 5 most relevant chunks
    """,
)
def semantic_search(
    request: SearchRequest,
    _: User = Depends(get_current_user),
    rag: RAGService = Depends(get_rag_service),
):
    """
    Example request body:
    {
        "query": "financial risk related to high debt ratio",
        "top_k": 5
    }
    """
    if not request.query.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Query cannot be empty",
        )

    results = rag.semantic_search(
        query=request.query,
        top_k_retrieve=20,  # Always retrieve 20 before reranking
        top_k_return=request.top_k,
    )

    chunk_results = [ChunkResult(**r) for r in results]

    return SearchResponse(
        query=request.query,
        results=chunk_results,
        total_retrieved=20,
        total_returned=len(chunk_results),
    )


@router.get(
    "/context/{document_id}",
    response_model=ContextResponse,
    summary="Get all indexed chunks for a document",
    description="Returns all text chunks stored in Qdrant for a given document, in order.",
)
def get_document_context(
    document_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
    rag: RAGService = Depends(get_rag_service),
):
    doc = get_document_by_id(db, document_id)
    chunks = rag.get_document_context(document_id)

    if not chunks:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No indexed chunks found for document {document_id}. Run /rag/index-document first.",
        )

    return ContextResponse(
        document_id=doc.id,
        title=doc.title,
        chunks=chunks,
    )
