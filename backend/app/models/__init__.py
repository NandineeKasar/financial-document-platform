"""
models/__init__.py

Imports all models so Alembic's env.py can discover them via Base.metadata.
Without these imports, Alembic won't know the tables exist and won't
generate migration files for them.
"""
from app.db.base import Base
from app.models.user import User
from app.models.role import Role
from app.models.permission import Permission
from app.models.document import Document

__all__ = ["Base", "User", "Role", "Permission", "Document"]
