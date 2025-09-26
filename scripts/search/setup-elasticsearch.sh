#!/usr/bin/env bash
set -euo pipefail

ES_URL="${ELASTICSEARCH_URL:-${ELASTICSEARCH_NODE:-http://localhost:9200}}"
INDEX_NAME="${ELASTICSEARCH_INDEX:-intelgraph-search}"
FORCE_RECREATE="${FORCE_RECREATE:-0}"

if [[ "${ES_URL}" == http://localhost:9200 && -n "${ELASTICSEARCH_NODE:-}" ]]; then
  ES_URL="${ELASTICSEARCH_NODE}"
fi

echo "[setup] Using Elasticsearch endpoint: ${ES_URL}" >&2
echo "[setup] Target index: ${INDEX_NAME}" >&2

if [[ "${FORCE_RECREATE}" == "1" ]]; then
  echo "[setup] FORCE_RECREATE enabled. Deleting existing index if present." >&2
  curl -sf -X DELETE "${ES_URL}/${INDEX_NAME}" >/dev/null || true
fi

status_code=$(curl -s -o /dev/null -w '%{http_code}' "${ES_URL}/${INDEX_NAME}")
if [[ "${status_code}" == "200" ]]; then
  echo "[setup] Index ${INDEX_NAME} already exists. Use FORCE_RECREATE=1 to rebuild." >&2
  exit 0
fi

echo "[setup] Creating index ${INDEX_NAME}" >&2
curl -sf -X PUT "${ES_URL}/${INDEX_NAME}" \
  -H 'Content-Type: application/json' \
  -d @- <<'JSON'
{
  "settings": {
    "number_of_shards": 1,
    "number_of_replicas": 1,
    "analysis": {
      "analyzer": {
        "intelgraph_text": {
          "type": "custom",
          "tokenizer": "standard",
          "filter": ["lowercase", "asciifolding", "snowball"]
        }
      }
    }
  },
  "mappings": {
    "dynamic": "false",
    "properties": {
      "id": { "type": "keyword" },
      "tenantId": { "type": "keyword" },
      "type": { "type": "keyword" },
      "nodeType": { "type": "keyword" },
      "source": { "type": "keyword" },
      "title": {
        "type": "text",
        "analyzer": "intelgraph_text",
        "fields": {
          "raw": { "type": "keyword", "ignore_above": 256 }
        }
      },
      "summary": { "type": "text", "analyzer": "intelgraph_text" },
      "content": { "type": "text", "analyzer": "intelgraph_text" },
      "labels": { "type": "keyword" },
      "props": { "type": "object", "dynamic": true },
      "createdAt": { "type": "date" },
      "updatedAt": { "type": "date" },
      "ingestedAt": { "type": "date" },
      "relationships": {
        "type": "nested",
        "properties": {
          "id": { "type": "keyword" },
          "type": { "type": "keyword" },
          "score": { "type": "float" }
        }
      }
    }
  }
}
JSON

echo "[setup] Index ${INDEX_NAME} created successfully." >&2
echo "[setup] You can ingest data with the bulk API. Example:" >&2
echo "curl -X POST \"${ES_URL}/${INDEX_NAME}/_bulk\" -H 'Content-Type: application/x-ndjson' --data-binary @bulk.ndjson" >&2
