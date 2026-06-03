"""
endpoints/auth.py — Authentication routes.

POST /auth/register — Create a new account
POST /auth/login    — Exchange credentials for a JWT token
GET  /auth/me       — Return current user's profile
"""
import logging
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.dependencies import get_db, get_current_user
from app.models.user import User
from app.schemas.auth import UserRegister, UserLogin, TokenResponse, UserResponse
from app.services.auth_service import register_user, authenticate_user

router = APIRouter(prefix="/auth", tags=["Authentication"])
logger = logging.getLogger(__name__)


@router.post(
    "/register",
    response_model=UserResponse,
    status_code=201,
    summary="Register a new user",
    description="Create a new user account. Returns the created user (without password).",
)
def register(data: UserRegister, db: Session = Depends(get_db)):
    """
    Register endpoint.
    - Validates email format and password strength via Pydantic
    - Hashes the password with bcrypt
    - Returns the new user object (never the password)
    """
    user = register_user(db, data)
    return user


@router.post(
    "/login",
    response_model=TokenResponse,
    summary="Login and get JWT token",
    description="Authenticate with email and password. Returns a JWT Bearer token.",
)
def login(data: UserLogin, db: Session = Depends(get_db)):
    """
    Login endpoint.
    - Verifies credentials
    - Returns a signed JWT token (valid for ACCESS_TOKEN_EXPIRE_MINUTES)

    Use the returned token in all subsequent requests:
      Authorization: Bearer <token>
    """
    token = authenticate_user(db, data.email, data.password)
    return TokenResponse(access_token=token)


@router.get(
    "/me",
    response_model=UserResponse,
    summary="Get current user profile",
    description="Returns the profile of the authenticated user.",
)
def get_me(current_user: User = Depends(get_current_user)):
    """
    Protected endpoint — requires a valid JWT token.
    FastAPI automatically calls get_current_user() via Depends().
    """
    return current_user
