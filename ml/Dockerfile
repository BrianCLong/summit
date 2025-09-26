# syntax=docker/dockerfile:1.7

ARG PYTHON_VERSION=3.12

FROM python:${PYTHON_VERSION}-slim AS build

ENV VIRTUAL_ENV=/opt/venv
ENV PATH="${VIRTUAL_ENV}/bin:${PATH}"
ENV PIP_NO_CACHE_DIR=1 PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /workspace

RUN apt-get update && apt-get install -y --no-install-recommends build-essential git \
    && rm -rf /var/lib/apt/lists/*

COPY pyproject.toml poetry.lock* ./

RUN python -m venv ${VIRTUAL_ENV} \
    && . ${VIRTUAL_ENV}/bin/activate \
    && pip install --upgrade pip wheel \
    && pip install "poetry==1.8.3" \
    && poetry config virtualenvs.create false \
    && poetry install --no-interaction --no-ansi --only main --without dev,gpu,community,spacy \
    && rm -rf /root/.cache/pip

# Copy only runtime sources to avoid shipping training/test assets
COPY app ./app
COPY __init__.py ./

# Remove bytecode and tests from the staged application
RUN find . -name "tests" -type d -prune -exec rm -rf {} + \
    && find . -name "__pycache__" -type d -prune -exec rm -rf {} +

FROM python:${PYTHON_VERSION}-slim AS runtime

ENV VIRTUAL_ENV=/opt/venv
ENV PATH="${VIRTUAL_ENV}/bin:${PATH}"
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1

WORKDIR /srv

RUN groupadd -r app && useradd -r -g app app

COPY --from=build /opt/venv /opt/venv
COPY --from=build /workspace/app ./app
COPY --from=build /workspace/__init__.py ./

USER app:app

EXPOSE 8081

CMD ["uvicorn", "app.main:api", "--host", "0.0.0.0", "--port", "8081"]