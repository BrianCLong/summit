FROM python:3.11-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

COPY pyproject.toml ./
COPY src ./src
COPY config ./config
COPY prompts ./prompts
COPY tests ./tests

RUN pip install --upgrade pip && \
    pip install -e .[dev]

ENTRYPOINT ["python", "-m", "agent.main"]
