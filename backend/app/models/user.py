"""
user.py — User ORM model.

Database Tables:
  - users      : Stores registered user accounts
  - user_roles : Association table linking users ↔ roles
"""
from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Table, ForeignKey
from sqlalchemy.orm import relationship

from app.db.base import Base

# ── Association table: users ↔ roles ─────────────────────────────────────────
user_roles = Table(
    "user_roles",
    Base.metadata,
    Column("user_id", Integer, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
    Column("role_id", Integer, ForeignKey("roles.id", ondelete="CASCADE"), primary_key=True),
)


class User(Base):
    """
    Represents a registered user.

    Columns:
      id              — Auto-incremented primary key
      email           — Unique identifier used for login
      full_name       — Display name
      hashed_password — bcrypt hash (never store plain text!)
      is_active       — Soft-disable accounts without deleting
      created_at      — Account creation timestamp
    """
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    full_name = Column(String(255), nullable=False)

    # IMPORTANT: Only the hashed password is stored
    hashed_password = Column(String(255), nullable=False)

    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Many-to-many: one user can have many roles
    roles = relationship(
        "Role",
        secondary=user_roles,
        back_populates="users",
        lazy="selectin",
    )

    # One-to-many: user can upload many documents
    documents = relationship("Document", back_populates="uploader", lazy="dynamic")

    def __repr__(self) -> str:
        return f"<User {self.email}>"
