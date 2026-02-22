#!/usr/bin/env bash
set -euo pipefail

if ! grep -q "ARG SOURCE_DATE_EPOCH" docker/repro.Dockerfile; then
  echo "DRIFT: docker/repro.Dockerfile missing ARG SOURCE_DATE_EPOCH"
  exit 1
fi

if ! grep -q "pnpm install --frozen-lockfile" docker/repro.Dockerfile; then
  echo "DRIFT: docker/repro.Dockerfile missing --frozen-lockfile"
  exit 1
fi

if ! grep -q "ENV PNPM_VERSION=" docker/repro.Dockerfile; then
  echo "DRIFT: docker/repro.Dockerfile missing pinned PNPM_VERSION"
  exit 1
fi

CI_VER=$(grep "version:" .github/workflows/repro-docker.yml | head -n1 | awk "{print \$2}")
DOCKER_VER=$(grep "ENV PNPM_VERSION=" docker/repro.Dockerfile | cut -d= -f2)

if [ "$CI_VER" != "$DOCKER_VER" ]; then
  echo "DRIFT: PNPM_VERSION mismatch. CI: $CI_VER, Docker: $DOCKER_VER"
  exit 1
fi

if [ ! -f .dockerignore ]; then
  echo "DRIFT: .dockerignore missing"
  exit 1
fi
if [ ! -f .gitattributes ]; then
  echo "DRIFT: .gitattributes missing"
  exit 1
fi

echo "Reproducibility drift check passed."
