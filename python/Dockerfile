# Hardened Python container with multi-stage build
FROM python:3.11-slim AS build
WORKDIR /app
ENV PIP_NO_CACHE_DIR=1 PIP_DISABLE_PIP_VERSION_CHECK=1
COPY requirements.txt .
RUN python -m venv /opt/venv && . /opt/venv/bin/activate \
 && pip install --upgrade pip \
 && pip install --require-hashes -r requirements.txt
COPY . .
RUN adduser --disabled-password --gecos "" --uid 10001 app

# Runtime stage using distroless
FROM gcr.io/distroless/python3-debian12
ENV PATH="/opt/venv/bin:$PATH" PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
WORKDIR /srv
COPY --from=build /opt/venv /opt/venv
COPY --from=build /app /srv
USER 10001:10001
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]