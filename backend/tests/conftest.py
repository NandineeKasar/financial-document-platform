"""
tests/conftest.py — Shared pytest fixtures.

Fixtures provide reusable test setup/teardown logic.
conftest.py is automatically loaded by pytest before any tests run.
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.main import app
from app.db.base import Base
from app.core.dependencies import get_db

# Use an in-memory SQLite database for tests
# This avoids needing a real PostgreSQL instance for unit tests
SQLALCHEMY_TEST_DATABASE_URL = "sqlite:///./test.db"

test_engine = create_engine(
    SQLALCHEMY_TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},  # Required for SQLite
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


def override_get_db():
    """Replace the real DB session with a test SQLite session."""
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture(scope="session", autouse=True)
def setup_database():
    """Create tables once before all tests, drop after."""
    from app.models import User, Role, Permission, Document
    Base.metadata.create_all(bind=test_engine)
    yield
    Base.metadata.drop_all(bind=test_engine)


@pytest.fixture
def db():
    """Provide a fresh DB session for each test."""
    connection = test_engine.connect()
    transaction = connection.begin()
    session = TestingSessionLocal(bind=connection)
    yield session
    session.close()
    transaction.rollback()  # Roll back after each test for isolation
    connection.close()


@pytest.fixture
def client(db):
    """FastAPI test client with overridden DB dependency."""
    app.dependency_overrides[get_db] = lambda: db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture
def admin_token(client):
    """Register and login as admin, return JWT token."""
    # Register
    client.post("/auth/register", json={
        "email": "testadmin@example.com",
        "full_name": "Test Admin",
        "password": "Admin@123",
    })
    # Login
    response = client.post("/auth/login", json={
        "email": "testadmin@example.com",
        "password": "Admin@123",
    })
    return response.json()["access_token"]


@pytest.fixture
def auth_headers(admin_token):
    """Authorization headers with admin token."""
    return {"Authorization": f"Bearer {admin_token}"}
