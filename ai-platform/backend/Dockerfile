# ==============================================================================
# AI Platform Backend Dockerfile (Python FastAPI)
# ==============================================================================
FROM python:3.11-slim AS base

WORKDIR /app

# 安裝系統相依套件
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 開發環境目標 (對應 docker-compose.dev.yml 的 target: development)
FROM base AS development
COPY . .
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload", "--no-server-header"]

# 正式生產環境目標
FROM base AS production
COPY . .
RUN useradd -u 1000 appuser && chown -R appuser:appuser /app
USER appuser

EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--no-server-header"]