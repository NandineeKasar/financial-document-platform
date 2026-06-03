"""
role_service.py — Business logic for RBAC (Role-Based Access Control).

Handles:
  - Creating roles
  - Assigning roles to users
  - Querying user roles and permissions
"""
import logging
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models.role import Role
from app.models.user import User

logger = logging.getLogger(__name__)


def create_role(db: Session, name: str) -> Role:
    """Create a new role. Raises 400 if role already exists."""
    existing = db.query(Role).filter(Role.name == name).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Role '{name}' already exists",
        )
    role = Role(name=name)
    db.add(role)
    db.commit()
    db.refresh(role)
    logger.info(f"Created role: {name}")
    return role


def assign_role_to_user(db: Session, user_id: int, role_name: str) -> User:
    """
    Assign a named role to a user.

    :raises 404: if user or role not found
    :raises 400: if user already has that role
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    role = db.query(Role).filter(Role.name == role_name).first()
    if not role:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Role '{role_name}' not found")

    if role in user.roles:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"User already has role '{role_name}'",
        )

    user.roles.append(role)
    db.commit()
    db.refresh(user)
    logger.info(f"Assigned role '{role_name}' to user {user.email}")
    return user


def get_user_roles(db: Session, user_id: int) -> list:
    """Return list of Role objects for a given user."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return user.roles


def get_user_permissions(db: Session, user_id: int) -> list:
    """
    Return a flat, deduplicated list of all permissions for a user
    (aggregated across all their roles).
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    perms = {}
    for role in user.roles:
        for perm in role.permissions:
            perms[perm.id] = perm  # Using dict deduplicates by ID
    return list(perms.values())
