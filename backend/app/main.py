"""
main.py — FastAPI application entry point.

This is the file uvicorn runs: `uvicorn app.main:app`

Responsibilities:
  - Create the FastAPI app instance
  - Register all routers (endpoints)
  - Run database initialization on startup
  - Configure CORS (Cross-Origin Resource Sharing)
  - Serve API documentation at /docs and /redoc
"""
import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.core.logging_config import setup_logging
from app.api.endpoints import auth, documents, roles, rag

# ── Logging ────────────────────────────────────────────────────────────────────
setup_logging(debug=settings.DEBUG)
logger = logging.getLogger(__name__)


# ── Lifespan (startup/shutdown events) ────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Code here runs BEFORE the app starts accepting requests.
    Use for: database setup, loading ML models, connecting to external services.

    The `yield` separates startup (before) from shutdown (after).
    """
    logger.info("=" * 60)
    logger.info(f"Starting {settings.APP_NAME}")
    logger.info(f"Environment: {settings.APP_ENV}")
    logger.info("=" * 60)

    # Create upload directory
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    logger.info(f"Upload directory ready: {settings.UPLOAD_DIR}")

    # Initialize database tables and seed default data
    try:
        from app.db.session import engine
        from app.db.base import Base
        from app.models import User, Role, Permission, Document  # Import to register models
        from app.db.init_db import init_db
        from app.db.session import SessionLocal

        # Create all tables (if they don't exist)
        # In production, use Alembic migrations instead
        Base.metadata.create_all(bind=engine)
        logger.info("Database tables created/verified")

        # Seed default roles, permissions, and admin user
        db = SessionLocal()
        try:
            init_db(db)
        finally:
            db.close()

    except Exception as e:
        logger.error(f"Database initialization failed: {e}")
        raise

    yield  # ← App is running and handling requests

    # Shutdown cleanup (if needed)
    logger.info("Application shutdown complete")


# ── FastAPI App ────────────────────────────────────────────────────────────────
app = FastAPI(
    title=settings.APP_NAME,
    description="""
## Financial Document Management API

A production-ready API for managing financial documents with AI-powered semantic search.

### Features
- **JWT Authentication** — Secure token-based auth
- **RBAC** — Role-based access control (Admin, Analyst, Auditor, Client)
- **Document Management** — Upload, retrieve, search PDFs
- **RAG Pipeline** — AI-powered semantic search using embeddings
- **Reranking** — Cross-encoder reranking for precision retrieval

### Quick Start
1. Register: `POST /auth/register`
2. Login: `POST /auth/login` → copy the `access_token`
3. Click **Authorize** above and paste: `Bearer <token>`
4. Upload a document: `POST /documents/upload`
5. Index it for search: `POST /rag/index-document`
6. Search: `POST /rag/search`

### Default Admin
- Email: `admin@example.com`
- Password: `Admin@123`
    """,
    version="1.0.0",
    docs_url="/docs",        # Swagger UI
    redoc_url="/redoc",      # ReDoc UI
    lifespan=lifespan,
)

# ── CORS Middleware ────────────────────────────────────────────────────────────
# CORS allows browser-based frontends on different domains to call this API.
# In production, replace "*" with your actual frontend domain.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],           # All origins (restrict in production)
    allow_credentials=True,
    allow_methods=["*"],           # GET, POST, PUT, DELETE, etc.
    allow_headers=["*"],           # Authorization, Content-Type, etc.
)

# ── Register Routers ───────────────────────────────────────────────────────────
# Each router handles a group of related endpoints.
# The prefix and tags appear in Swagger UI.
app.include_router(auth.router)
app.include_router(roles.router)
app.include_router(documents.router)
app.include_router(rag.router)


# ── Health Check ───────────────────────────────────────────────────────────────
@app.get("/", tags=["Health"], summary="Health check")
def health_check():
    """Returns 200 OK if the API is running."""
    return JSONResponse({"status": "ok", "app": settings.APP_NAME, "version": "1.0.0"})


@app.get("/health", tags=["Health"], summary="Detailed health check")
def detailed_health():
    """Check connectivity of all services."""
    from app.db.session import engine
    from sqlalchemy import text

    health = {"api": "ok", "database": "unknown", "qdrant": "unknown"}

    # Check PostgreSQL
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        health["database"] = "ok"
    except Exception as e:
        health["database"] = f"error: {str(e)}"

    # Check Qdrant
    try:
        from qdrant_client import QdrantClient
        client = QdrantClient(host=settings.QDRANT_HOST, port=settings.QDRANT_PORT)
        client.get_collections()
        health["qdrant"] = "ok"
    except Exception as e:
        health["qdrant"] = f"error: {str(e)}"

    return JSONResponse(health)
