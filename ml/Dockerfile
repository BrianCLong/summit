FROM python:3.12-slim

WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1

RUN apt-get update && apt-get install -y build-essential && rm -rf /var/lib/apt/lists/*

COPY pyproject.toml poetry.lock* /app/
RUN pip install --no-cache-dir poetry && poetry config virtualenvs.create false \
  && poetry config repositories.pytorch https://download.pytorch.org/whl/cpu \
  && pip install torch==2.3.1 torchvision==0.18.1 --extra-index-url https://download.pytorch.org/whl/cpu \
  && poetry install --no-interaction --no-ansi


COPY . /app

EXPOSE 8081
CMD ["uvicorn", "app.main:api", "--host", "0.0.0.0", "--port", "8081"]