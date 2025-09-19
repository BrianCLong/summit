#!/usr/bin/env bash
set -euo pipefail
mkdir -p security/sbom
# npm (monorepo safe)
if command -v pnpm >/dev/null 2>&1; then corepack enable && corepack prepare pnpm@latest --activate; fi
if [ -f package.json ]; then npx @cyclonedx/cyclonedx-npm --output-file security/sbom/npm-${GITHUB_SHA}.json --output-format json || true; fi
# python
if [ -f requirements.txt ] || [ -f pyproject.toml ]; then pip install cyclonedx-bom >/dev/null 2>&1 || true; cyclonedx-py --format json --output security/sbom/python-${GITHUB_SHA}.json || true; fi