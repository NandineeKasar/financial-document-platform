# ─────────────────────────────────────────────────────────────────────────────
# Dockerfile — Builds the FastAPI application image
#
# Multi-stage build strategy:
#   Stage 1 (builder): Install Python dependencies into a venv
#   Stage 2 (runtime): Copy only the venv — keeps the final image small
# ─────────────────────────────────────────────────────────────────────────────

# ── Stage 1: Build dependencies ──────────────────────────────────────────────
FROM python:3.11-slim AS builder

# Set working directory inside the container
WORKDIR /app

# Install system libraries needed to compile Python packages
# (psycopg2 needs libpq-dev, sentence-transformers needs build tools)
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Create a virtual environment to isolate dependencies
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Install dependencies BEFORE copying source code
# Docker caches this layer — rebuilds are fast if requirements.txt doesn't change
COPY requirements.txt .
RUN pip install --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt


# ── Stage 2: Runtime image ────────────────────────────────────────────────────
FROM python:3.11-slim AS runtime

WORKDIR /app

# Install runtime-only system libraries (no build tools)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    && rm -rf /var/lib/apt/lists/*

# Copy the virtual environment from the builder stage
COPY --from=builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Copy application source code
COPY . .

# Create the uploads directory (will be mounted as a volume in production)
RUN mkdir -p uploads

# Create a non-root user for security
# Running as root inside a container is a security risk
RUN useradd -r -s /bin/false appuser && \
    chown -R appuser:appuser /app
USER appuser

# Document which port the app listens on (doesn't actually publish it)
EXPOSE 8000

# Health check — Docker will restart the container if this fails
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD python -c "import httpx; httpx.get('http://localhost:8000/health').raise_for_status()"

# Start the FastAPI server
# --host 0.0.0.0 makes it accessible outside the container
# --workers 1 is fine for development; increase for production
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]
