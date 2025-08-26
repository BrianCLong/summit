FROM python:3.12-slim AS base
WORKDIR /app
COPY ../pyproject.toml ../Makefile ./
RUN pip install --no-cache-dir fastapi uvicorn pydantic cryptography numpy networkx prometheus_client pytest
COPY .. .
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8080"]
