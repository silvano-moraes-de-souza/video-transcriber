# Video Transcriber Worker — Production Dockerfile
FROM python:3.12-slim AS base

# System deps: ffmpeg + yt-dlp runtime deps + CA certs
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    ca-certificates \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Non-root user
RUN groupadd -r appuser && useradd -r -g appuser appuser
WORKDIR /app

# Python deps (cached layer)
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt && \
    pip install --no-cache-dir yt-dlp

# App code
COPY worker.py .

# Runtime user
USER appuser

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8080/health || exit 1

# Expose health port (opcional, worker não serve HTTP por padrão)
# EXPOSE 8080

CMD ["python", "worker.py"]


# ============================================================
# MULTI-STAGE para imagem menor (opcional)
# ============================================================
# FROM base AS builder
# COPY requirements.txt .
# RUN pip install --no-cache-dir --user -r requirements.txt && pip install --no-cache-dir --user yt-dlp
#
# FROM python:3.12-slim
# RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg ca-certificates && rm -rf /var/lib/apt/lists/*
# RUN groupadd -r appuser && useradd -r -g appuser appuser
# WORKDIR /app
# COPY --from=builder /root/.local /home/appuser/.local
# COPY worker.py .
# USER appuser
# ENV PATH=/home/appuser/.local/bin:$PATH
# CMD ["python", "worker.py"]