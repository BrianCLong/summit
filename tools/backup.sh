#!/usr/bin/env bash
set -euo pipefail
[ -f ".orchestra.env" ] && set -a && . ./.orchestra.env && set +a
TS="$(date +%Y%m%d-%H%M%S)"
OUT="intelgraph-symphony-${TS}.tar.gz"
tar -czf "$OUT" \
  litellm.config.yaml \
  Justfile* \
  docker-compose.neo4j.yml \
  tools/*.sh tools/*.py \
  rag/index/rag.duckdb 2>/dev/null || true \
  rag/corpus \
  db/migrations 2>/dev/null || true \
  docs 2>/dev/null || true \
  pm 2>/dev/null || true \
  prompts 2>/dev/null || true
echo "$OUT"
