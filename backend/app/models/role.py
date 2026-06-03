"""
role.py — Role and Permission ORM models.

Database Tables:
  - roles          : Admin, Financial Analyst, Auditor, Client
  - permissions    : Fine-grained actions (upload_documents, etc.)
  - role_permissions: Association table linking roles ↔ permissions
"""
from sqlalchemy import Column, Integer, String, Table, ForeignKey
from sqlalchemy.orm import relationship

from app.db.base import Base

# ── Association table: roles ↔ permissions ────────────────────────────────────
# This is a pure join table with no extra columns — SQLAlchemy handles it
# as a simple Table, not a full model class.
role_permissions = Table(
    "role_permissions",
    Base.metadata,
    Column("role_id", Integer, ForeignKey("roles.id", ondelete="CASCADE"), primary_key=True),
    Column("permission_id", Integer, ForeignKey("permissions.id", ondelete="CASCADE"), primary_key=True),
)


class Role(Base):
    """
    Represents a user role (e.g., Admin, Financial Analyst).

    Columns:
      id   — Auto-incremented primary key
      name — Unique role name (e.g., "Admin")
    """
    __tablename__ = "roles"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), unique=True, nullable=False, index=True)

    # Many-to-many: one role has many permissions
    # secondary=role_permissions uses the join table above
    permissions = relationship(
        "Permission",
        secondary=role_permissions,
        back_populates="roles",
        lazy="selectin",  # Load permissions automatically with the role
    )

    # back_populates="roles" is defined in User model
    users = relationship("User", secondary="user_roles", back_populates="roles")

    def __repr__(self) -> str:
        return f"<Role {self.name}>"


class Permission(Base):
    """
    Represents a single permission action.

    Columns:
      id          — Auto-incremented primary key
      name        — Unique permission key (e.g., "upload_documents")
      description — Human-readable label
    """
    __tablename__ = "permissions"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False, index=True)
    description = Column(String(255), nullable=True)

    # Many-to-many: one permission can belong to many roles
    roles = relationship(
        "Role",
        secondary=role_permissions,
        back_populates="permissions",
    )

    def __repr__(self) -> str:
        return f"<Permission {self.name}>"
