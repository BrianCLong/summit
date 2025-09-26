FROM python:3.11-slim AS base

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

COPY pyproject.toml README.md ./
COPY feed_processor ./feed_processor

RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir .

CMD ["feed-processor"]
