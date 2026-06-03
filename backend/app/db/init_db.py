"""
init_db.py — Seed the database with default data.

Creates:
  - Default roles (Admin, Financial Analyst, Auditor, Client)
  - Permissions for each role
  - A default admin user

Called once on application startup if tables are empty.
"""
import logging
from sqlalchemy.orm import Session

from app.core.security import get_password_hash
from app.models.role import Role
from app.models.permission import Permission
from app.models.user import User

logger = logging.getLogger(__name__)

# Define the default roles and their associated permissions
DEFAULT_ROLES_PERMISSIONS = {
    "Admin": [
        "full_access",
        "upload_documents",
        "edit_documents",
        "delete_documents",
        "view_documents",
        "review_documents",
        "manage_users",
        "manage_roles",
    ],
    "Financial Analyst": [
        "upload_documents",
        "edit_documents",
        "view_documents",
    ],
    "Auditor": [
        "review_documents",
        "view_documents",
    ],
    "Client": [
        "view_documents",
    ],
}

DEFAULT_ADMIN = {
    "email": "admin@example.com",
    "full_name": "System Admin",
    "password": "Admin123",
}


def init_db(db: Session) -> None:
    """
    Seed database with default roles, permissions, and admin user.
    Safe to call multiple times — skips existing records.
    """
    _create_roles_and_permissions(db)
    _create_admin_user(db)


def _create_roles_and_permissions(db: Session) -> None:
    """Create roles and their permissions if they don't exist."""
    for role_name, permission_names in DEFAULT_ROLES_PERMISSIONS.items():
        # Check if role already exists
        role = db.query(Role).filter(Role.name == role_name).first()
        if not role:
            role = Role(name=role_name)
            db.add(role)
            db.flush()  # Get the role ID before assigning permissions
            logger.info(f"Created role: {role_name}")

        # Create and attach permissions
        for perm_name in permission_names:
            perm = db.query(Permission).filter(Permission.name == perm_name).first()
            if not perm:
                perm = Permission(name=perm_name, description=perm_name.replace("_", " ").title())
                db.add(perm)

            # Attach permission to role if not already linked
            if perm not in role.permissions:
                role.permissions.append(perm)

    db.commit()
    logger.info("Default roles and permissions seeded.")


def _create_admin_user(db: Session) -> None:
    """Create default admin user if not exists."""
    existing = db.query(User).filter(User.email == DEFAULT_ADMIN["email"]).first()
    if existing:
        return

    # Fetch the Admin role
    admin_role = db.query(Role).filter(Role.name == "Admin").first()

    admin_user = User(
        email=DEFAULT_ADMIN["email"],
        full_name=DEFAULT_ADMIN["full_name"],
        hashed_password=get_password_hash(DEFAULT_ADMIN["password"]),
        is_active=True,
    )
    if admin_role:
        admin_user.roles.append(admin_role)

    db.add(admin_user)
    db.commit()
    logger.info(f"Default admin user created: {DEFAULT_ADMIN['email']} / {DEFAULT_ADMIN['password']}")
