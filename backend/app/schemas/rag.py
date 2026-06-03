"""schemas/rag.py — Pydantic schemas for RAG pipeline endpoints."""
from typing import List, Optional
from pydantic import BaseModel


class SearchRequest(BaseModel):
    """Request body for POST /rag/search"""
    query: str
    top_k: int = 5  # How many final results to return after reranking


class ChunkResult(BaseModel):
    """A single retrieved document chunk with its relevance score."""
    document_id: int
    title: str
    company_name: str
    chunk_text: str
    score: float              # Similarity score from vector search or reranker
    chunk_index: Optional[int] = None


class SearchResponse(BaseModel):
    """Response body for POST /rag/search"""
    query: str
    results: List[ChunkResult]
    total_retrieved: int      # Number of chunks before reranking
    total_returned: int       # Number after reranking


class IndexResponse(BaseModel):
    """Response body for POST /rag/index-document"""
    document_id: int
    chunks_indexed: int
    message: str


class ContextResponse(BaseModel):
    """Response body for GET /rag/context/{document_id}"""
    document_id: int
    title: str
    chunks: List[str]
