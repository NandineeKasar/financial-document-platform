# Financial Document Management API

A production-ready FastAPI application for managing financial documents with AI-powered semantic search, built for the Nimap AI/ML internship assignment.

---

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Technology Stack](#technology-stack)
3. [Environment Setup](#environment-setup)
4. [Installation](#installation)
5. [Running the Application](#running-the-application)
6. [API Documentation](#api-documentation)
7. [Testing](#testing)
8. [Docker Deployment](#docker-deployment)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENT                               │
│              (Browser / Postman / Frontend)                 │
└─────────────────────┬───────────────────────────────────────┘
                      │ HTTP/HTTPS
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                    FastAPI Application                       │
│  ┌──────────┐  ┌──────────┐  ┌───────────┐  ┌──────────┐  │
│  │   Auth   │  │   RBAC   │  │ Documents │  │   RAG    │  │
│  │ /auth/*  │  │ /roles/* │  │/documents │  │  /rag/*  │  │
│  └────┬─────┘  └────┬─────┘  └─────┬─────┘  └────┬─────┘  │
│       │              │              │              │         │
│  ┌────▼──────────────▼──────────────▼─────┐        │        │
│  │           Services Layer                │        │        │
│  │  auth_service | role_service           │        │        │
│  │  document_service | rag_service        │◄───────┘        │
│  └───────┬────────────────────────┬───────┘                 │
└──────────┼────────────────────────┼─────────────────────────┘
           │                        │
           ▼                        ▼
┌──────────────────┐    ┌───────────────────────┐
│   PostgreSQL     │    │        Qdrant          │
│                  │    │   (Vector Database)    │
│ • users          │    │                        │
│ • roles          │    │ • document embeddings  │
│ • permissions    │    │ • chunk metadata       │
│ • documents      │    │ • similarity search    │
└──────────────────┘    └───────────────────────┘
```

### RAG Pipeline Flow
```
PDF Upload
    │
    ▼
Text Extraction (pypdf)
    │
    ▼
Chunking (LangChain RecursiveCharacterTextSplitter)
  chunk_size=500, overlap=50
    │
    ▼
Embedding (sentence-transformers/all-MiniLM-L6-v2)
  384-dimensional dense vectors
    │
    ▼
Store in Qdrant (with metadata: doc_id, title, company)
    │
═══════════════════════════════
    │  SEARCH QUERY
    ▼
Query Embedding (same model)
    │
    ▼
Vector Search → Top 20 results (Cosine Similarity)
    │
    ▼
Reranking (cross-encoder/ms-marco-MiniLM-L-6-v2)
  Scores each (query, chunk) pair jointly
    │
    ▼
Top 5 Most Relevant Results
```

---

## Technology Stack

| Technology | Purpose | Why |
|---|---|---|
| **FastAPI** | Web framework | Async, auto-documentation, Pydantic integration |
| **PostgreSQL** | Relational database | ACID transactions, strong typing, JSON support |
| **SQLAlchemy** | ORM | Pythonic database access, schema management |
| **Alembic** | DB migrations | Version-controlled schema changes |
| **JWT (python-jose)** | Authentication | Stateless, secure, standard |
| **bcrypt (passlib)** | Password hashing | Industry-standard, salted, slow by design |
| **pypdf** | PDF text extraction | Lightweight, pure Python |
| **LangChain** | Text splitting | Smart chunking with overlap |
| **sentence-transformers** | Embeddings | Fast, high-quality semantic vectors |
| **Qdrant** | Vector database | Fast ANN search, filtering, persistence |
| **CrossEncoder** | Reranking | Precise relevance scoring |
| **Docker** | Containerization | Reproducible, portable deployment |

---

## Environment Setup

### Step 1: Install Python 3.11+
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install python3.11 python3.11-venv python3-pip

# macOS (using Homebrew)
brew install python@3.11

# Windows — download from https://python.org
# ✓ Check "Add Python to PATH" during install

# Verify
python3 --version  # Should say 3.11.x or higher
```

### Step 2: Install Git
```bash
# Ubuntu/Debian
sudo apt install git

# macOS
brew install git

# Windows — download from https://git-scm.com

# Verify
git --version
```

### Step 3: Install Docker
```bash
# Ubuntu
sudo apt install docker.io docker-compose-plugin
sudo usermod -aG docker $USER   # Add yourself to docker group
newgrp docker                   # Apply group change without logout

# macOS/Windows — install Docker Desktop from https://docker.com

# Verify
docker --version
docker compose version
```

### Step 4: Install VS Code (recommended)
Download from https://code.visualstudio.com

Recommended extensions:
- Python (ms-python.python)
- Pylance
- REST Client (for testing APIs)
- SQLTools + PostgreSQL driver

---

## Installation

### Clone and Setup
```bash
# Clone the repository
git clone <your-repo-url>
cd financial_document_management

# Create virtual environment
python3 -m venv venv

# Activate it
source venv/bin/activate        # Linux/macOS
venv\Scripts\activate           # Windows

# Install dependencies
pip install -r requirements.txt
```

### Configure Environment
```bash
# Copy the example env file
cp .env.example .env

# Edit .env with your values
nano .env   # or use VS Code: code .env
```

Key variables to update:
```env
SECRET_KEY=your-random-64-char-secret-key-here
DATABASE_URL=postgresql://postgres:password@localhost:5432/financial_docs
```

Generate a secure secret key:
```bash
python -c "import secrets; print(secrets.token_hex(32))"
```

---

## Running the Application

### Option A: Docker (Recommended — runs everything)
```bash
# Build and start all services (FastAPI + PostgreSQL + Qdrant)
docker compose up --build

# Run in background
docker compose up --build -d

# View logs
docker compose logs -f api

# Stop everything
docker compose down
```

### Option B: Local Development

**1. Start PostgreSQL:**
```bash
# Using Docker just for the DB
docker run -d \
  --name fdm_postgres \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=financial_docs \
  -p 5432:5432 \
  postgres:15-alpine
```

**2. Start Qdrant:**
```bash
docker run -d \
  --name fdm_qdrant \
  -p 6333:6333 \
  qdrant/qdrant:latest
```

**3. Run database migrations:**
```bash
alembic upgrade head
```

**4. Start the API:**
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The `--reload` flag auto-restarts when you change code.

**API is available at:**
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc
- Health: http://localhost:8000/health

---

## API Documentation

### Default Admin Credentials
```
Email:    admin@example.com
Password: Admin123
```

### Authentication Flow
```
1. POST /auth/register    → Create account
2. POST /auth/login       → Get JWT token
3. Use token in headers:  Authorization: Bearer <token>
```

### Complete API Reference

#### Auth Endpoints
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/auth/register` | None | Register new user |
| POST | `/auth/login` | None | Login, get token |
| GET | `/auth/me` | Required | Get own profile |

**Register:**
```json
POST /auth/register
{
  "email": "analyst@company.com",
  "full_name": "Jane Doe",
  "password": "Secure@123"
}
```

**Login:**
```json
POST /auth/login
{
  "email": "analyst@company.com",
  "password": "Secure@123"
}
// Response:
{
  "access_token": "eyJhbGci...",
  "token_type": "bearer"
}
```

#### Role Endpoints (Admin only)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/roles/create` | Create a role |
| POST | `/users/assign-role` | Assign role to user |
| GET | `/users/{id}/roles` | Get user's roles |
| GET | `/users/{id}/permissions` | Get user's permissions |

**Assign role:**
```json
POST /users/assign-role
{
  "user_id": 2,
  "role_name": "Financial Analyst"
}
```

#### Document Endpoints
| Method | Endpoint | Required Role | Description |
|--------|----------|---------------|-------------|
| POST | `/documents/upload` | Analyst, Admin | Upload PDF |
| GET | `/documents` | Any | List all |
| GET | `/documents/{id}` | Any | Get one |
| GET | `/documents/search` | Any | Filter by metadata |
| DELETE | `/documents/{id}` | Admin | Delete |

**Upload (multipart/form-data):**
```
POST /documents/upload
Content-Type: multipart/form-data

file: [PDF file]
title: "Q3 2024 Financial Report"
company_name: "Acme Corporation"
document_type: "report"
```

**Search by metadata:**
```
GET /documents/search?company_name=Acme&document_type=report
```

#### RAG Endpoints
| Method | Endpoint | Required Role | Description |
|--------|----------|---------------|-------------|
| POST | `/rag/index-document` | Analyst, Admin | Index PDF into Qdrant |
| DELETE | `/rag/remove-document/{id}` | Admin | Remove embeddings |
| POST | `/rag/search` | Any | Semantic search |
| GET | `/rag/context/{id}` | Any | Get document chunks |

**Semantic Search:**
```json
POST /rag/search
{
  "query": "financial risk related to high debt ratio",
  "top_k": 5
}

// Response:
{
  "query": "financial risk related to high debt ratio",
  "results": [
    {
      "document_id": 1,
      "title": "Q3 Financial Report",
      "company_name": "Acme Corp",
      "chunk_text": "The company's debt-to-equity ratio increased to 2.4...",
      "score": 0.892
    }
  ],
  "total_retrieved": 20,
  "total_returned": 5
}
```

---

## Testing

### Using Swagger UI
1. Open http://localhost:8000/docs
2. Click **Authorize** (top right) 
3. Enter: `Bearer <your-token>`
4. Try any endpoint directly in the browser

### Using Pytest
```bash
# Run all tests
pytest tests/ -v

# Run with coverage report
pytest tests/ --cov=app --cov-report=html

# Run specific test file
pytest tests/test_auth.py -v
```

### Sample Workflow (Postman or curl)
```bash
# 1. Register
curl -X POST http://localhost:8000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"user@test.com","full_name":"Test User","password":"Test@1234"}'

# 2. Login
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@test.com","password":"Test@1234"}'

# Copy token from response, then:

# 3. List documents
curl http://localhost:8000/documents \
  -H "Authorization: Bearer <token>"

# 4. Semantic search
curl -X POST http://localhost:8000/rag/search \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"query":"debt to equity ratio analysis"}'
```

---

## Docker Deployment

All three services are defined in `docker-compose.yml`:

```bash
# Production deployment
docker compose up --build -d

# Check status
docker compose ps

# View logs
docker compose logs -f

# Rebuild after code changes
docker compose up --build -d api
```

### Port Mapping
| Service | Container Port | Host Port |
|---------|---------------|-----------|
| FastAPI | 8000 | 8000 |
| PostgreSQL | 5432 | 5432 |
| Qdrant REST | 6333 | 6333 |
| Qdrant gRPC | 6334 | 6334 |

---

## Database Migrations (Alembic)

```bash
# Create a new migration after changing models
alembic revision --autogenerate -m "add new column"

# Apply all pending migrations
alembic upgrade head

# Roll back one migration
alembic downgrade -1

# View migration history
alembic history
```
