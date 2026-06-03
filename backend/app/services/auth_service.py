"""
auth_service.py — Business logic for user authentication.
"""
import logging
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.core.security import get_password_hash, verify_password, create_access_token
from app.models.user import User
from app.models.role import Role
from app.schemas.auth import UserRegister

logger = logging.getLogger(__name__)


def register_user(db: Session, data: UserRegister) -> User:
    """
    Create a new user account and assign the requested role.
    """
    existing = db.query(User).filter(User.email == data.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )

    user = User(
        email=data.email,
        full_name=data.full_name,
        hashed_password=get_password_hash(data.password),
        is_active=True,
    )

    # Assign the requested role (defaults to "Client")
    role_name = data.role or "Client"
    role = db.query(Role).filter(Role.name == role_name).first()
    if role:
        user.roles.append(role)
    else:
        # Fallback: assign Client role if requested role doesn't exist
        client_role = db.query(Role).filter(Role.name == "Client").first()
        if client_role:
            user.roles.append(client_role)

    db.add(user)
    db.commit()
    db.refresh(user)

    logger.info(f"New user registered: {user.email} with role: {role_name}")
    return user


def authenticate_user(db: Session, email: str, password: str) -> str:
    """
    Verify credentials and return a JWT access token.
    """
    user = db.query(User).filter(User.email == email, User.is_active == True).first()

    if not user or not verify_password(password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = create_access_token(data={"sub": user.email})
    logger.info(f"User logged in: {user.email}")
    return token