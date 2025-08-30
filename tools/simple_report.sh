#!/usr/bin/env bash
set -euo pipefail
[ -f ".orchestra.env" ] && set -a && . ./.orchestra.env && set +a
python3 tools/status_json.py >/dev/null
ts=$(date +"%Y%m%d-%H%M")
mkdir -p reports
{
  echo "# IntelGraph Orchestra Report — $ts"
  echo
  echo "## Status"
  jq -r '.services|to_entries[]|"- \(.key): \(.value)"' dashboard/status.json
  echo
  echo "## RAG"
  jq -r '"- rows: \(.rag.rows)\n- files: \(.rag.files)"' dashboard/status.json
  echo
  echo "## Env"
  echo "- PROFILE=${PROFILE:-unset}"
  echo "- AUTONOMY=${AUTONOMY:-unset}"
  echo "- RAG_TOPK=${RAG_TOPK:-unset}"
} > "reports/$ts.md"
echo "Wrote reports/$ts.md"
