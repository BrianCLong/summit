#!/usr/bin/env bash
set -euo pipefail
[ -f ".orchestra.env" ] && set -a && . ./.orchestra.env && set +a

# Settings (override via env if needed)
MIG_DIR="${MIG_DIR:-db/migrations}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.neo4j.yml}"
NEO4J_USER="${NEO4J_USER:-neo4j}"
NEO4J_PASS="${NEO4J_PASS:-testtest1}"
KEEP_DB="${KEEP_DB:-0}"

# docker compose shim (v2 or legacy docker-compose)
if docker compose version >/dev/null 2>&1; then
  DC="docker compose"
else
  DC="docker-compose"
fi

$DC -f "$COMPOSE_FILE" up -d neo4j-ephemeral

echo "Waiting for Neo4j to accept bolt connections..."
i=0
while true; do
  if docker exec neo4j-ephemeral cypher-shell -a bolt://localhost:7687 -u "$NEO4J_USER" -p "$NEO4J_PASS" "RETURN 1;" >/dev/null 2>&1; then
    echo "Neo4j is ready"
    break
  fi
  i=$((i+1))
  if [ $((i % 10)) -eq 0 ]; then
    echo "...still starting (t+${i}s). Recent logs:"
    docker logs --tail=15 neo4j-ephemeral || true
  fi
  if [ $i -ge 240 ]; then
    echo "Neo4j did not become ready in 240s"
    docker logs --tail=120 neo4j-ephemeral || true
    exit 1
  fi
  sleep 1
done

if [ ! -d "$MIG_DIR" ]; then
  echo "MIG_DIR '$MIG_DIR' does not exist"
  exit 1
fi

found=0
# POSIX-safe: find + sort; handle spaces via IFS in the for list
IFS='
'
for f in $(find "$MIG_DIR" -type f -name '*.cypher' -print | LC_ALL=C sort); do
  [ -n "$f" ] || continue
  found=1
  echo "Applying $(basename "$f")"
  docker exec -i neo4j-ephemeral cypher-shell \
    -a bolt://localhost:7687 \
    -u "$NEO4J_USER" -p "$NEO4J_PASS" \
    --format plain < "$f"
done
unset IFS

if [ $found -eq 0 ]; then
  echo "No *.cypher files found in $MIG_DIR"
  exit 0
fi

echo "All migrations applied."

if [ "$KEEP_DB" != "1" ]; then
  $DC -f "$COMPOSE_FILE" down -v
  echo "Disposable DB removed."
else
  echo "KEEP_DB=1 — inspect at http://localhost:7474 (user: $NEO4J_USER, pass: $NEO4J_PASS)"
fi
