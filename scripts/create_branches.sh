#!/usr/bin/env bash
set -euo pipefail

branches=(
  feature/schema-registry
  feature/time-travel-queries
  feature/er-service
  feature/er-queue-ui
  feature/er-explain
  feature/ingest-lineage
  feature/export-manifests
  feature/claim-nodes
  feature/nl-to-cypher
  feature/graphrag-retriever
  feature/citation-enforcer
  feature/cytoscape-view
  feature/mapbox-sync
  feature/timeline-brushing
  feature/xai-overlays
  feature/opa-gateway
  feature/field-level-authz
  feature/reason-for-access
  feature/otel-prom
  feature/slo-dashboards
  feature/slow-query-killer
  feature/archive-tiering
)

for b in "${branches[@]}"; do
  if git rev-parse --verify "$b" >/dev/null 2>&1; then
    echo "Branch exists: $b"
  else
    echo "Creating branch: $b"
    git branch "$b"
  fi
done

echo "All branches ensured." 
