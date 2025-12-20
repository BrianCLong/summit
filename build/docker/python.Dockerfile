# syntax=docker/dockerfile:1.6

# --- build stage: compile wheels in a slim builder ---
FROM python:3.11-slim AS build
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1
WORKDIR /workspace

# Enforce lockfile for reproducibility
COPY requirements.txt requirements.lock ./
RUN test -f requirements.lock

RUN python -m venv /opt/venv \
    && /opt/venv/bin/pip install --upgrade pip wheel build

# Build dependency wheels without dev extras
RUN /opt/venv/bin/pip wheel --no-deps --wheel-dir /wheels -r requirements.lock

COPY . .

# Optional: build project wheel if setup.cfg/pyproject exists
RUN if [ -f pyproject.toml ] || [ -f setup.py ]; then \
      /opt/venv/bin/python -m build --wheel --outdir /wheels; \
    fi

# --- runtime stage: distroless python ---
FROM gcr.io/distroless/python3

ARG BUILD_SHA="unknown"
ARG BUILD_TIMESTAMP="unknown"
ARG SBOM_DIGEST=""

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

COPY --from=build /wheels /wheels
COPY --from=build /workspace /app

RUN ["/usr/bin/python3", "-m", "pip", "install", "--no-deps", "--no-index", "--find-links=/wheels", "-r", "/app/requirements.lock"]

USER 65532:65532
EXPOSE 8080

LABEL org.opencontainers.image.source="https://github.com/summit/intelgraph" \
      org.opencontainers.image.revision="$BUILD_SHA" \
      org.opencontainers.image.created="$BUILD_TIMESTAMP" \
      org.opencontainers.image.base.name="gcr.io/distroless/python3" \
      org.opencontainers.image.vendor="IntelGraph" \
      org.opencontainers.image.description="IntelGraph Python runtime (distroless, non-root, read-only)" \
      org.opencontainers.image.sbom="$SBOM_DIGEST"

HEALTHCHECK --interval=30s --timeout=3s --start-period=20s --retries=3 CMD ["/usr/bin/python3","-c","import urllib.request,sys;\n\
import json\n\
url='http://127.0.0.1:8080/healthz'\n\
try:\n    resp=urllib.request.urlopen(url,timeout=2)\n    sys.exit(0 if resp.getcode()==200 else 1)\nexcept Exception:\n    sys.exit(1)\n"]

ENTRYPOINT ["/usr/bin/python3"]
CMD ["-m", "app.main"]
