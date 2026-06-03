"""
config.py — Central configuration file.

Reads all settings from environment variables (or .env file).
Pydantic-settings automatically validates types and raises errors
if required variables are missing.
"""
from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # ── Application ──────────────────────────────────────────────────────────
    APP_NAME: str = "Financial Document Management"
    APP_ENV: str = "development"
    DEBUG: bool = True

    # ── Security ─────────────────────────────────────────────────────────────
    # SECRET_KEY is used to sign JWT tokens. Must be long and random.
    SECRET_KEY: str = "change-me-to-a-random-32-char-string"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # ── Database ─────────────────────────────────────────────────────────────
    DATABASE_URL: str = "postgresql://postgres:password@localhost:5432/financial_docs"

    # ── Qdrant Vector DB ─────────────────────────────────────────────────────
    QDRANT_HOST: str = "localhost"
    QDRANT_PORT: int = 6333
    QDRANT_COLLECTION_NAME: str = "financial_documents"

    # ── File Storage ─────────────────────────────────────────────────────────
    UPLOAD_DIR: str = "uploads"
    MAX_FILE_SIZE_MB: int = 50

    # ── AI Models ────────────────────────────────────────────────────────────
    EMBEDDING_MODEL: str = "all-MiniLM-L6-v2"
    RERANKER_MODEL: str = "cross-encoder/ms-marco-MiniLM-L-6-v2"

    # ── Chunking ─────────────────────────────────────────────────────────────
    CHUNK_SIZE: int = 500
    CHUNK_OVERLAP: int = 50

    class Config:
        # Automatically loads from .env file if present
        env_file = ".env"
        case_sensitive = True


# lru_cache ensures Settings() is only created once (singleton pattern)
@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
