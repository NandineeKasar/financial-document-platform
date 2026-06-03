"""
security.py — Authentication utilities.

Handles:
  - Password hashing with bcrypt (one-way, cannot be reversed)
  - JWT token creation and verification
"""
from datetime import datetime, timedelta
from typing import Optional

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.core.config import settings

# CryptContext configures the hashing algorithm.
# bcrypt is the industry standard for password hashing — it is slow by
# design (making brute-force attacks expensive) and automatically salts hashes.
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def _truncate(password: str) -> str:
    return password.encode("utf-8")[:72].decode("utf-8", errors="ignore")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(_truncate(plain_password), hashed_password)


def get_password_hash(password: str) -> str:
    return pwd_context.hash(_truncate(password))
# def verify_password(plain_password: str, hashed_password: str) -> bool:
#     """
#     Compare a plain-text password against a stored bcrypt hash.
#     Returns True if they match, False otherwise.
#     Never store or compare plain passwords directly.
#     """
#     return pwd_context.verify(plain_password, hashed_password)


# def get_password_hash(password: str) -> str:
#     """
#     Hash a plain-text password using bcrypt.
#     The hash includes the salt, so each call produces a different result
#     even for the same password — this is expected and correct.
#     """
#     return pwd_context.hash(password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """
    Create a signed JWT access token.

    :param data: Payload to embed in the token (typically {"sub": user_email}).
    :param expires_delta: How long until the token expires.
    :return: Signed JWT string.

    The token is signed with SECRET_KEY so the server can verify it was not
    tampered with. Do NOT put sensitive data (passwords, credit cards) in JWT
    payloads — they are base64-encoded but not encrypted.
    """
    to_encode = data.copy()

    # Set expiration time
    expire = datetime.utcnow() + (
        expires_delta if expires_delta else timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire})

    # encode() signs the payload with the secret key
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_access_token(token: str) -> Optional[str]:
    """
    Decode and verify a JWT token.

    :param token: The raw JWT string from the Authorization header.
    :return: The subject (email) if valid, None if invalid or expired.

    jose.jwt.decode() automatically:
      - Verifies the signature
      - Checks the expiration time
      - Raises JWTError if anything is wrong
    """
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        email: str = payload.get("sub")
        return email
    except JWTError:
        return None
