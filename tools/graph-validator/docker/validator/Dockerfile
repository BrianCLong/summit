FROM python:3.11-slim

WORKDIR /app

COPY . /app

ENV PYTHONPATH=/app

ENTRYPOINT ["python3", "-m", "graph_validator.cli"]
