"""
tests/test_auth.py — Tests for authentication endpoints.

Covers: register, login, duplicate registration, invalid credentials.
"""


def test_register_success(client):
    """New user can register with valid data."""
    response = client.post("/auth/register", json={
        "email": "newuser@example.com",
        "full_name": "New User",
        "password": "NewPass@1",
    })
    assert response.status_code == 201
    data = response.json()
    assert data["email"] == "newuser@example.com"
    assert "hashed_password" not in data  # Never expose password


def test_register_duplicate_email(client):
    """Registering with an existing email returns 400."""
    payload = {"email": "dup@example.com", "full_name": "Dup", "password": "Dup@12345"}
    client.post("/auth/register", json=payload)
    response = client.post("/auth/register", json=payload)
    assert response.status_code == 400
    assert "already registered" in response.json()["detail"]


def test_register_weak_password(client):
    """Registration fails with a weak password."""
    response = client.post("/auth/register", json={
        "email": "weak@example.com",
        "full_name": "Weak Pass",
        "password": "short",
    })
    assert response.status_code == 422  # Pydantic validation error


def test_login_success(client):
    """Valid credentials return a JWT token."""
    client.post("/auth/register", json={
        "email": "login@example.com",
        "full_name": "Login User",
        "password": "Login@123",
    })
    response = client.post("/auth/login", json={
        "email": "login@example.com",
        "password": "Login@123",
    })
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"


def test_login_wrong_password(client):
    """Wrong password returns 401."""
    client.post("/auth/register", json={
        "email": "wrongpass@example.com",
        "full_name": "Wrong",
        "password": "Correct@1",
    })
    response = client.post("/auth/login", json={
        "email": "wrongpass@example.com",
        "password": "WrongPass@1",
    })
    assert response.status_code == 401


def test_get_me(client, auth_headers):
    """Authenticated user can get their own profile."""
    response = client.get("/auth/me", headers=auth_headers)
    assert response.status_code == 200
    assert "email" in response.json()


def test_get_me_unauthenticated(client):
    """Unauthenticated request to /auth/me returns 401."""
    response = client.get("/auth/me")
    assert response.status_code == 401
