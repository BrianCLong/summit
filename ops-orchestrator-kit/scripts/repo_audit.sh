#!/usr/bin/env bash
set -Eeuo pipefail

ROOT="${1:-.}"
OUT="${2:-ops-logs/repo-audit.txt}"
mkdir -p ops-logs
{
  echo "Repo audit @ $(date -Iseconds)"
  echo "Root: $ROOT"
  echo

  echo "Top-level entries:"
  ls -la "$ROOT" | sed 's/^/  /'
  echo

  echo "Language/file signals:"
  echo "  package.json count: $(find "$ROOT" -name package.json | wc -l)"
  echo "  pyproject.toml count: $(find "$ROOT" -name pyproject.toml | wc -l)"
  echo "  Chart.yaml count: $(find "$ROOT" -name Chart.yaml | wc -l)"
  echo "  *.tf count: $(find "$ROOT" -name '*.tf' | wc -l)"
  echo "  Dockerfile* count: $(find "$ROOT" -name 'Dockerfile*' | wc -l)"
  echo "  docker-compose* count: $(find "$ROOT" -name 'docker-compose*' | wc -l)"
  echo

  echo "CI workflows present:"
  if [[ -d "$ROOT/.github/workflows" ]]; then
    ls -1 "$ROOT/.github/workflows" | sed 's/^/  - /'
  else
    echo "  (none)"
  fi
} | tee "$OUT"

echo "Wrote $OUT"
