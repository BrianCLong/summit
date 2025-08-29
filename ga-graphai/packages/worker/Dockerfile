FROM python:3.12-slim
WORKDIR /app
COPY pyproject.toml ./
RUN pip install celery
COPY src ./src
CMD ["celery", "-A", "worker.src.main", "worker", "--loglevel=INFO"]
