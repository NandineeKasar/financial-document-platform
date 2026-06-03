"""
rag_service.py — RAG (Retrieval-Augmented Generation) Pipeline.

Pipeline for indexing documents:
  Document → Text Extraction → Chunking → Embeddings → Qdrant

Pipeline for search:
  Query → Embedding → Vector Search (Top 20) → Reranking → Top 5

Technologies used:
  - pypdf: Extract text from PDF files
  - LangChain RecursiveCharacterTextSplitter: Split text into semantic chunks
  - sentence-transformers: Create dense vector embeddings
  - Qdrant: Vector database to store and search embeddings
  - cross-encoder/ms-marco-MiniLM-L-6-v2: Reranking model

WHY RERANKING?
  Vector search (embedding similarity) is fast but imprecise — it finds
  "approximately similar" vectors. Reranking uses a more powerful
  cross-encoder model that reads BOTH the query and each chunk together,
  scoring true relevance. This two-stage approach:
    Stage 1 (fast retrieval): Get top 20 candidates from Qdrant
    Stage 2 (precise reranking): Score all 20 with cross-encoder, keep top 5
"""
import logging
from typing import List, Tuple

from pypdf import PdfReader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from sentence_transformers import SentenceTransformer, CrossEncoder
from qdrant_client import QdrantClient
from qdrant_client.models import (
    Distance,
    VectorParams,
    PointStruct,
    Filter,
    FieldCondition,
    MatchValue,
)

from app.core.config import settings

logger = logging.getLogger(__name__)


class RAGService:
    """
    Singleton service that manages embedding models, Qdrant connection,
    and the full indexing + retrieval pipeline.

    Using a class ensures the heavy models (SentenceTransformer, CrossEncoder)
    are loaded only ONCE when the application starts, not on every request.
    """

    def __init__(self):
        logger.info("Initializing RAG service — loading models (this may take a minute)...")

        # ── Embedding model ───────────────────────────────────────────────────
        # all-MiniLM-L6-v2 produces 384-dimensional vectors.
        # It's fast, small, and works well for semantic search.
        self.embedder = SentenceTransformer(settings.EMBEDDING_MODEL)
        self.embedding_dim = self.embedder.get_sentence_embedding_dimension()
        logger.info(f"Embedding model loaded: {settings.EMBEDDING_MODEL} (dim={self.embedding_dim})")

        # ── Reranker model ────────────────────────────────────────────────────
        # CrossEncoder reads query + passage together (not separately like bi-encoder).
        # Slower but much more accurate for ranking relevance.
        self.reranker = CrossEncoder(settings.RERANKER_MODEL)
        logger.info(f"Reranker model loaded: {settings.RERANKER_MODEL}")

        # ── Qdrant client ─────────────────────────────────────────────────────
        self.qdrant = QdrantClient(host=settings.QDRANT_HOST, port=settings.QDRANT_PORT)
        self._ensure_collection()
        logger.info("Qdrant connection established")

        # ── Text splitter ─────────────────────────────────────────────────────
        # RecursiveCharacterTextSplitter splits on natural boundaries:
        # paragraphs → sentences → words (in that order of preference).
        # chunk_overlap keeps context across chunk boundaries.
        self.splitter = RecursiveCharacterTextSplitter(
            chunk_size=settings.CHUNK_SIZE,
            chunk_overlap=settings.CHUNK_OVERLAP,
            separators=["\n\n", "\n", ". ", " ", ""],
        )

    def _ensure_collection(self) -> None:
        """
        Create the Qdrant collection if it doesn't exist.
        A collection is like a "table" in Qdrant — it stores vectors + metadata.
        """
        existing = [c.name for c in self.qdrant.get_collections().collections]
        if settings.QDRANT_COLLECTION_NAME not in existing:
            self.qdrant.create_collection(
                collection_name=settings.QDRANT_COLLECTION_NAME,
                vectors_config=VectorParams(
                    size=self.embedding_dim,
                    distance=Distance.COSINE,  # Cosine similarity: best for semantic search
                ),
            )
            logger.info(f"Created Qdrant collection: {settings.QDRANT_COLLECTION_NAME}")

    # ── INDEXING ───────────────────────────────────────────────────────────────

    def extract_text_from_pdf(self, file_path: str) -> str:
        """
        Extract all text from a PDF file using pypdf.

        pypdf reads the PDF's text layer (works for digital PDFs).
        For scanned PDFs, OCR would be needed (not implemented here).

        :param file_path: Absolute or relative path to the .pdf file
        :return: Concatenated text from all pages
        """
        reader = PdfReader(file_path)
        pages_text = []
        for i, page in enumerate(reader.pages):
            text = page.extract_text() or ""
            if text.strip():
                pages_text.append(text)
        full_text = "\n\n".join(pages_text)
        logger.debug(f"Extracted {len(full_text)} characters from {len(reader.pages)} pages")
        return full_text

    def chunk_text(self, text: str) -> List[str]:
        """
        Split a long text into smaller overlapping chunks.

        WHY CHUNK?
          Embedding models have a maximum input length (~512 tokens for
          most models). Chunking also allows precise retrieval of the
          exact paragraph that answers a query, rather than returning
          an entire document.

        :return: List of text chunks
        """
        chunks = self.splitter.split_text(text)
        logger.debug(f"Split text into {len(chunks)} chunks")
        return chunks

    def index_document(self, document_id: int, file_path: str, title: str, company_name: str) -> int:
        """
        Full indexing pipeline for one document.

        Steps:
          1. Extract text from PDF
          2. Split into chunks
          3. Create embeddings for each chunk (batch for efficiency)
          4. Store in Qdrant with metadata

        :returns: Number of chunks indexed
        """
        # Step 1: Extract text
        text = self.extract_text_from_pdf(file_path)
        if not text.strip():
            logger.warning(f"No text extracted from document {document_id}")
            return 0

        # Step 2: Chunk
        chunks = self.chunk_text(text)
        if not chunks:
            return 0

        # Step 3: Batch-encode all chunks at once (faster than one-by-one)
        # Returns a numpy array of shape (num_chunks, embedding_dim)
        embeddings = self.embedder.encode(chunks, show_progress_bar=False, batch_size=32)

        # Step 4: Build Qdrant PointStruct objects
        # Each point has:
        #   - id: unique integer (we use document_id * 10000 + chunk_index)
        #   - vector: the embedding
        #   - payload: metadata we want to filter/retrieve later
        points = []
        for i, (chunk, embedding) in enumerate(zip(chunks, embeddings)):
            point_id = document_id * 100_000 + i  # Unique ID across all documents

            points.append(PointStruct(
                id=point_id,
                vector=embedding.tolist(),  # Qdrant needs a Python list, not numpy array
                payload={
                    "document_id": document_id,
                    "title": title,
                    "company_name": company_name,
                    "chunk_text": chunk,
                    "chunk_index": i,
                },
            ))

        # Upload to Qdrant in one batch operation
        self.qdrant.upsert(
            collection_name=settings.QDRANT_COLLECTION_NAME,
            points=points,
        )

        logger.info(f"Indexed document {document_id}: {len(chunks)} chunks stored in Qdrant")
        return len(chunks)

    def remove_document(self, document_id: int) -> None:
        """
        Remove all vectors for a document from Qdrant.

        Uses a payload filter to find all points belonging to this document.
        """
        self.qdrant.delete(
            collection_name=settings.QDRANT_COLLECTION_NAME,
            points_selector=Filter(
                must=[
                    FieldCondition(
                        key="document_id",
                        match=MatchValue(value=document_id),
                    )
                ]
            ),
        )
        logger.info(f"Removed all vectors for document {document_id} from Qdrant")

    # ── RETRIEVAL ──────────────────────────────────────────────────────────────

    def semantic_search(self, query: str, top_k_retrieve: int = 20, top_k_return: int = 5) -> List[dict]:
        """
        Full two-stage retrieval pipeline.

        Stage 1 — Vector Search (fast, approximate):
          Embed the query and find the top 20 most similar chunks using
          cosine similarity in Qdrant. This is O(log n) with HNSW indexing.

        Stage 2 — Reranking (slower, precise):
          Pass all 20 (query, chunk) pairs to the CrossEncoder model.
          It jointly processes both texts and assigns a relevance score.
          Sort by score, return top 5.

        :param query: User's natural language question
        :param top_k_retrieve: Candidates to fetch from Qdrant (default 20)
        :param top_k_return: Final results after reranking (default 5)
        :return: List of chunk result dicts sorted by relevance
        """
        if not query.strip():
            return []

        # ── Stage 1: Embed query and search Qdrant ────────────────────────────
        query_vector = self.embedder.encode(query).tolist()

        search_results = self.qdrant.search(
            collection_name=settings.QDRANT_COLLECTION_NAME,
            query_vector=query_vector,
            limit=top_k_retrieve,
            with_payload=True,  # Include metadata in results
        )

        if not search_results:
            logger.info(f"No results found for query: '{query}'")
            return []

        logger.debug(f"Qdrant returned {len(search_results)} candidates")

        # ── Stage 2: Reranking ────────────────────────────────────────────────
        # Build (query, chunk_text) pairs for the cross-encoder
        pairs: List[Tuple[str, str]] = [
            (query, hit.payload["chunk_text"])
            for hit in search_results
        ]

        # CrossEncoder.predict() scores each pair independently
        # Returns a numpy array of float scores
        rerank_scores = self.reranker.predict(pairs)

        # Combine results with reranker scores
        reranked = sorted(
            zip(search_results, rerank_scores),
            key=lambda x: x[1],  # Sort by reranker score (descending)
            reverse=True,
        )

        # Take top_k_return results and format the output
        final_results = []
        for hit, score in reranked[:top_k_return]:
            final_results.append({
                "document_id": hit.payload["document_id"],
                "title": hit.payload["title"],
                "company_name": hit.payload["company_name"],
                "chunk_text": hit.payload["chunk_text"],
                "chunk_index": hit.payload.get("chunk_index"),
                "score": float(score),
            })

        logger.info(f"Reranking complete: returning top {len(final_results)} results")
        return final_results

    def get_document_context(self, document_id: int) -> List[str]:
        """
        Retrieve all stored chunks for a document in order.

        Useful for displaying document context or verifying indexing.
        """
        results, _ = self.qdrant.scroll(
            collection_name=settings.QDRANT_COLLECTION_NAME,
            scroll_filter=Filter(
                must=[FieldCondition(key="document_id", match=MatchValue(value=document_id))]
            ),
            limit=1000,  # Documents are unlikely to have >1000 chunks
            with_payload=True,
        )

        # Sort by chunk_index to restore document order
        results.sort(key=lambda p: p.payload.get("chunk_index", 0))
        return [p.payload["chunk_text"] for p in results]


# ── Singleton instance ─────────────────────────────────────────────────────────
# Instantiated once when this module is first imported.
# The application startup event triggers this import, loading models upfront.
_rag_service: RAGService | None = None


def get_rag_service() -> RAGService:
    """
    Dependency-injection accessor for RAGService.

    Lazy initialization — creates the service on first call.
    This avoids loading heavy ML models if RAG is never used.
    """
    global _rag_service
    if _rag_service is None:
        _rag_service = RAGService()
    return _rag_service
