# ==============================================================================
# AI Dashboard Backend Dockerfile (Python FastAPI)
# ==============================================================================
FROM python:3.11-slim

WORKDIR /app

# 安裝系統編譯依賴與 PostgreSQL 支援
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# 安裝 Python 套件
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 複製後端程式碼
COPY . .

# 建立資料庫與持久化資料目錄 (對應 /data/modelops.db)
RUN mkdir -p /data

EXPOSE 8000

# 啟動 FastAPI 服務 (對應 main:app 入口)
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]