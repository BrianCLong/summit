FROM python:3.12-slim AS base
WORKDIR /app
COPY pyproject.toml ./
RUN pip install .
COPY app ./app
USER nobody
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8080"]
HEALTHCHECK CMD curl -f http://localhost:8080/healthz || exit 1
