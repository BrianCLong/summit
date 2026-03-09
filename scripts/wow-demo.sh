#!/usr/bin/env bash
set -euo pipefail

echo "====================================="
echo "  Summit WOW Demo - Zero to Insight  "
echo "  (runs in ~60-180s on decent laptop) "
echo "====================================="

# Assume stack is up; if not, prompt
if ! docker ps | grep -q neo4j; then
  echo "Infra not running. Starting golden path..."
  ./scripts/golden-path.sh
  sleep 30  # wait for containers healthy
fi

echo "→ Clearing previous demo data (optional)..."
# Add Cypher clear query via cypher-shell or API if endpoint exists

echo "→ Ingesting demo datasets..."
# Placeholder - replace with real ingest call once endpoint wired
# For now: simulate or use existing ingest-taxonomy.js style
for file in datasets/demo/*.jsonl datasets/demo/*.csv; do
  if [ -f "$file" ]; then
    echo "Ingesting $file..."
    # curl -X POST http://localhost:4000/api/ingest/file -F "file=@$file" || true
    # Or node some-ingest-script.js "$file"
  fi
done

echo "→ Triggering demo agent swarm on 'Acme Corp'..."
# GraphQL mutation example
curl -X POST http://localhost:4000/api/graphql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "mutation { runAgentSwarm(input: { query: \"Investigate Acme Corp\", targetEntity: \"ent_001\" }) { id status reportUrl } }"
  }'

echo ""
echo "→ Opening results..."
# Use sensible defaults for opening browser
if command -v open >/dev/null; then
  open http://localhost:3000/dashboard/reports || true
  open http://localhost:7474/browser || true
elif command -v xdg-open >/dev/null; then
  xdg-open http://localhost:3000/dashboard/reports || true
  xdg-open http://localhost:7474/browser || true
else
  echo "Please visit http://localhost:3000/dashboard/reports to view results"
  echo "Please visit http://localhost:7474/browser to view the graph"
fi

echo "Done! Check the UI for provenance-rich report + graph visualization."
echo "Share feedback: open issue or tweet @BrianCLong"
