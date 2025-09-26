# syntax=docker/dockerfile:1.7

FROM python:3.11-slim AS builder

ENV VIRTUAL_ENV=/opt/venv
ENV PATH="${VIRTUAL_ENV}/bin:${PATH}"
ENV PIP_NO_CACHE_DIR=1 PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

# Install system build dependencies and clean up afterwards
RUN apt-get update && apt-get install -y --no-install-recommends build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY requirements.txt ./

# Install dependencies into an isolated virtual environment
RUN python -m venv ${VIRTUAL_ENV} \
    && . ${VIRTUAL_ENV}/bin/activate \
    && pip install --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt \
    && pip uninstall -y pytest pytest-asyncio black flake8 \
    && rm -rf /root/.cache/pip

# Copy the service source files
COPY app.py ./
COPY middleware ./middleware

# Remove bytecode to keep the runtime layer lean
RUN find ${VIRTUAL_ENV} -name "__pycache__" -type d -prune -exec rm -rf {} +

FROM gcr.io/distroless/python3-debian12 AS runtime

ENV VIRTUAL_ENV=/opt/venv
ENV PATH="${VIRTUAL_ENV}/bin:${PATH}"
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1

WORKDIR /app

# Distroless already runs as non-root uid/gid 65532
USER 65532:65532

COPY --from=builder /opt/venv /opt/venv
COPY --from=builder /app/app.py ./
COPY --from=builder /app/middleware ./middleware

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD ["/opt/venv/bin/python", "-c", "import requests; requests.get('http://localhost:8000/health')"]

EXPOSE 8000

CMD ["/opt/venv/bin/python", "app.py"]