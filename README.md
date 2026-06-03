# FinDoc AI — Financial Document Intelligence Platform

An AI-powered document management platform for financial teams with semantic search, RAG pipeline, and role-based access control.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16, TypeScript, Tailwind CSS |
| Backend | FastAPI, Python |
| Database | PostgreSQL |
| Vector DB | Qdrant |
| AI / Embeddings | Sentence Transformers (all-MiniLM-L6-v2) |
| Reranker | cross-encoder/ms-marco-MiniLM-L-6-v2 |
| Auth | JWT (python-jose) + bcrypt |

---

## Features

- Upload and manage financial PDF documents
- Role-based access control (Admin, Financial Analyst, Auditor, Client)
- Semantic search using vector similarity and reranking
- Document indexing and RAG pipeline
- Analytics dashboard
- Settings page with permission viewer

---

## Prerequisites

Make sure these are installed before starting:

- [Node.js LTS](https://nodejs.org) — for the frontend
- [Python 3.10+](https://www.python.org/downloads/) — for the backend
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) — for PostgreSQL and Qdrant
- [Git](https://git-scm.com) — for version control

---

## Project Structure

```
findoc-project/
├── backend/      # FastAPI backend
│   ├── app/
│   │   ├── api/
│   │   ├── models/
│   │   ├── schemas/
│   │   ├── services/
│   │   └── main.py
│   ├── docker-compose.yml
│   ├── requirements.txt
│   └── .env
└── frontend/     # Next.js frontend
    ├── app/
    ├── components/
    ├── lib/
    └── .env.local
```

---

## Setup & Installation

### Step 1 — Clone the repository

```bash
git clone https://github.com/YOURUSERNAME/financial-document-platform.git
cd financial-document-platform
```

---

### Step 2 — Start the databases

Make sure Docker Desktop is running first, then:

```bash
cd backend
docker-compose up postgres qdrant -d
```

This starts:
- PostgreSQL on port `5432`
- Qdrant on port `6333`

---

### Step 3 — Set up the backend

Stay in the `backend` folder.

**Create virtual environment:**
```bash
python -m venv venv
```

**Activate it:**

Windows:
```bash
venv\Scripts\activate
```

Mac/Linux:
```bash
source venv/bin/activate
```

**Install dependencies:**
```bash
pip install -r requirements.txt
```

**Create the `.env` file** — create a new file called `.env` inside the backend folder and paste this:

```env
APP_NAME=Financial Document Management
APP_ENV=development
DEBUG=true

SECRET_KEY=change-me-to-a-random-secret-key
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

DATABASE_URL=postgresql://postgres:password@localhost:5432/financial_docs

QDRANT_HOST=localhost
QDRANT_PORT=6333
QDRANT_COLLECTION_NAME=financial_documents

UPLOAD_DIR=uploads
MAX_FILE_SIZE_MB=50

EMBEDDING_MODEL=all-MiniLM-L6-v2
RERANKER_MODEL=cross-encoder/ms-marco-MiniLM-L-6-v2

CHUNK_SIZE=500
CHUNK_OVERLAP=50
```

**Run the backend:**
```bash
uvicorn app.main:app --reload
```

Backend runs at → http://localhost:8000  
API docs at → http://localhost:8000/docs

---

### Step 4 — Set up the frontend

Open a **new terminal window** and go to the frontend folder:

```bash
cd frontend
```

**Install dependencies:**
```bash
npm install
```

**Create the `.env.local` file** — create a new file called `.env.local` inside the frontend folder and paste this:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

**Run the frontend:**
```bash
npm run dev
```

Frontend runs at → http://localhost:3000

---

## Running the App Every Time

You need **3 terminal windows** open simultaneously:

**Terminal 1 — Start databases:**
```bash
cd backend
docker-compose up postgres qdrant -d
```

**Terminal 2 — Start backend:**

Windows:
```bash
cd backend
venv\Scripts\activate
uvicorn app.main:app --reload
```

Mac/Linux:
```bash
cd backend
source venv/bin/activate
uvicorn app.main:app --reload
```

**Terminal 3 — Start frontend:**
```bash
cd frontend
npm run dev
```

Then open your browser at → **http://localhost:3000**

---

## Default Admin Login

| Field | Value |
|---|---|
| Email | admin@example.com |
| Password | Admin@123 |

---

## User Roles

| Role | Permissions |
|---|---|
| Admin | Full access — upload, delete, manage users and roles |
| Financial Analyst | Upload, edit and view documents |
| Auditor | Review and view documents |
| Client | View documents only |

New users can select their role during registration at `/register`.

---

## How to Use

1. **Login** at http://localhost:3000 using the default admin credentials
2. **Register new users** — go to `/register`, fill in details and select a role
3. **Upload a document** — go to Upload Document, fill in title, company, type and select a PDF
4. **Index the document** — go to Documents → click the document → click "Index Document"
5. **Search** — go to Semantic Search and type a natural language question
6. **View analytics** — go to Analytics to see upload trends and document stats
7. **View settings** — go to Settings to see your profile, role and permissions

---

## API Documentation

Full interactive API docs (Swagger UI) available at:

```
http://localhost:8000/docs
```

---

## Notes

- First run will download AI models (~200MB) automatically — this is normal
- Make sure Docker Desktop is running before starting the databases
- If you get a port conflict error, run `docker-compose down` then `docker-compose up postgres qdrant -d`
- Uploaded files are stored in `backend/uploads/` folder
