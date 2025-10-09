#!/usr/bin/env bash
set -euo pipefail

: "${POSTGRES_PORT:=15432}"
: "${NEO4J_HTTP_PORT:=17474}"
: "${NEO4J_BOLT_PORT:=17687}"
: "${ADMINER_PORT:=18080}"
: "${API_PORT:=18081}"
: "${WEB_PORT:=18082}"
: "${REDIS_HOST_PORT:=16379}"
: "${REDIS_PASSWORD:=redispass}"
: "${POSTGRES_USER:=summit}"

echo ">> checking core..."
pg_isready -h 127.0.0.1 -p "$POSTGRES_PORT" -U "$POSTGRES_USER"
redis-cli -p "$REDIS_HOST_PORT" -a "$REDIS_PASSWORD" ping | grep -q PONG
curl -fsS "http://localhost:${NEO4J_HTTP_PORT}" >/dev/null

echo ">> checking app (if up)..."
curl -fsS "http://localhost:${API_PORT}/health" >/dev/null || echo "api not up (ok if core-only)"
curl -fsS "http://localhost:${WEB_PORT}/health" >/dev/null || echo "web not up (ok if core-only)"

echo "OK"