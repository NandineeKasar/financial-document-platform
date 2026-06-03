"""
dependencies.py — FastAPI dependency injection functions.

FastAPI's Depends() system lets you declare reusable logic (like "get
current user") that is automatically injected into route handlers.

This file provides:
  - get_db()       → yields a SQLAlchemy database session
  - get_current_user() → decodes JWT and returns the authenticated User
  - require_role() → factory that creates a role-checking dependency
"""
import logging
from typing import List

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.core.security import decode_access_token
from app.db.session import SessionLocal
from app.models.user import User
from app.models.role import Role

logger = logging.getLogger(__name__)

# OAuth2PasswordBearer tells FastAPI where to find the token.
# The tokenUrl is used by Swagger UI's "Authorize" button.
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


def get_db():
    """
    Database session dependency.

    Creates a new SQLAlchemy session for each request and
    automatically closes it when the request is done (even on errors).

    Usage in route:
        @router.get("/example")
        def example(db: Session = Depends(get_db)):
            ...
    """
    db = SessionLocal()
    try:
        yield db        # FastAPI injects this db object into the route
    finally:
        db.close()      # Always executed — prevents connection leaks


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    """
    Decode JWT token and return the authenticated User object.

    Steps:
      1. Extract Bearer token from Authorization header
      2. Decode & verify the JWT signature + expiry
      3. Look up user in the database by email (stored in token "sub")
      4. Return User model or raise 401

    Raises HTTPException 401 if token is invalid or user not found.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},  # Required by OAuth2 spec
    )

    email = decode_access_token(token)
    if email is None:
        raise credentials_exception

    user = db.query(User).filter(User.email == email, User.is_active == True).first()
    if user is None:
        raise credentials_exception

    return user


def require_roles(allowed_roles: List[str]):
    """
    Role-checking dependency factory.

    Returns a dependency function that verifies the current user
    has at least one of the allowed roles.

    Usage:
        @router.post("/admin-only")
        def admin_route(user = Depends(require_roles(["Admin"]))):
            ...

    :param allowed_roles: List of role names that can access the endpoint.
    """
    def role_checker(current_user: User = Depends(get_current_user)) -> User:
        # Collect all role names assigned to this user
        user_roles = {role.name for role in current_user.roles}

        # Admin always has full access
        if "Admin" in user_roles:
            return current_user

        # Check if user has any of the required roles
        if not user_roles.intersection(set(allowed_roles)):
            logger.warning(
                f"User {current_user.email} with roles {user_roles} "
                f"attempted to access endpoint requiring {allowed_roles}"
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required role(s): {', '.join(allowed_roles)}",
            )
        return current_user

    return role_checker
