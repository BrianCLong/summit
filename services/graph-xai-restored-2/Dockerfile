FROM python:3.11-slim AS base

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PYTHONPATH=/app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
FROM base AS deps
WORKDIR /app

RUN printf "fastapi==0.109.2\nuvicorn[standard]==0.27.1\nredis==5.0.1\nstructlog==24.1.0\npydantic==2.6.1\npython-multipart==0.0.9" > requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Production image
FROM base AS runtime
WORKDIR /app

# Create non-root user
RUN groupadd --gid 1001 xai && \
    useradd --uid 1001 --gid xai --create-home xai

# Copy dependencies
COPY --from=deps /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=deps /usr/local/bin /usr/local/bin

# Copy application
COPY --chown=xai:xai app/ ./app/

USER xai

EXPOSE 4011

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:4011/health || exit 1

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "4011"]