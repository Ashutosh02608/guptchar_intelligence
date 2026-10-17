# ==============================================================================
# Guptchar - Production Multi-Stage Dockerfile
# Combines React 19 Frontend + FastAPI 24*7 Surveillance Engine + Neon DB Client
# ==============================================================================

# --- Stage 1: Build Frontend Dashboard ---
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm install

COPY frontend/ ./
RUN npm run build

# --- Stage 2: Production Python Backend ---
FROM python:3.11-slim
WORKDIR /app

# Install system dependencies for asyncpg and reportlab
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python requirements
COPY requirements.txt ./
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy backend, extractor, AI, and support modules
COPY backend/ ./backend/
COPY ai/ ./ai/
COPY extractor/ ./extractor/
COPY run_app.py ./

# Copy compiled frontend SPA from Stage 1 into frontend/dist
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Default cloud container environment variables
ENV HOST=0.0.0.0
ENV PORT=8000
ENV PYTHONUNBUFFERED=1

# Expose surveillance server port
EXPOSE 8000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
    CMD curl -f http://localhost:${PORT}/api/health || exit 1

# Launch production server
CMD ["python", "backend/run.py"]
