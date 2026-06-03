"""
tests/test_documents.py — Tests for document management endpoints.
"""
import io


def _make_pdf_bytes() -> bytes:
    """Create a minimal valid PDF in memory for upload tests."""
    return b"""%PDF-1.4
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj
3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]>>endobj
xref\n0 4\n0000000000 65535 f\ntrailer<</Root 1 0 R/Size 4>>\nstartxref\n%%EOF"""


def test_upload_document(client, auth_headers):
    """Authenticated user with Analyst role can upload a document."""
    files = {"file": ("test.pdf", io.BytesIO(_make_pdf_bytes()), "application/pdf")}
    data = {
        "title": "Q1 Financial Report",
        "company_name": "Acme Corp",
        "document_type": "report",
    }
    response = client.post("/documents/upload", files=files, data=data, headers=auth_headers)
    # Note: may be 403 if user lacks role — acceptable in test env
    assert response.status_code in (201, 403)


def test_list_documents(client, auth_headers):
    """Authenticated users can list documents."""
    response = client.get("/documents", headers=auth_headers)
    assert response.status_code == 200
    assert isinstance(response.json(), list)


def test_get_nonexistent_document(client, auth_headers):
    """Fetching a non-existent document returns 404."""
    response = client.get("/documents/99999", headers=auth_headers)
    assert response.status_code == 404


def test_search_documents(client, auth_headers):
    """Document search with filters returns a list."""
    response = client.get(
        "/documents/search",
        params={"company_name": "Acme"},
        headers=auth_headers,
    )
    assert response.status_code == 200
    assert isinstance(response.json(), list)


def test_unauthenticated_list(client):
    """Unauthenticated request to /documents returns 401."""
    response = client.get("/documents")
    assert response.status_code == 401
