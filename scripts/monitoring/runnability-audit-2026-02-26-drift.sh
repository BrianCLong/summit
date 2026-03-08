#!/usr/bin/env bash
set -eo pipefail

echo "Running repo hygiene drift detector..."

FORBIDDEN_DIRS=(
  ".claude"
  ".grok"
  ".gemini"
  ".jules"
  ".qwen"
  ".qwen-cache"
  ".maestro"
  ".windsurf"
  ".cursor"
  ".vale"
  ".zap"
  ".agent-guidance"
  ".agentic-prompts"
  ".disabled"
  ".quarantine"
  ".archive"
)

DRIFT_FOUND=0
TRACKED_DIRS=()

for dir in "${FORBIDDEN_DIRS[@]}"; do
  # Check if directory exists and is tracked
  if [ -n "$(git ls-files "${dir}")" ]; then
    TRACKED_DIRS+=("$dir")
    DRIFT_FOUND=1
  fi
done

if [ "$DRIFT_FOUND" -eq 1 ]; then
  echo "❌ ERROR: Forbidden AI tool / bloat directories are tracked in version control:"
  # Print sorted for determinism
  printf '%s\n' "${TRACKED_DIRS[@]}" | sort | sed 's/^/  - /'

  # Create deterministic output JSON
  mkdir -p artifacts/runnability-audit-2026-02-26
  JSON_OUTPUT="{\"status\":\"failed\",\"drift\":["
  for i in "${!TRACKED_DIRS[@]}"; do
    JSON_OUTPUT+="\"${TRACKED_DIRS[$i]}\""
    if [ $i -lt $((${#TRACKED_DIRS[@]}-1)) ]; then
      JSON_OUTPUT+=","
    fi
  done
  JSON_OUTPUT+="]}"
  echo "$JSON_OUTPUT" > artifacts/runnability-audit-2026-02-26/report.json

  echo "Please remove these directories using 'git rm -r --cached <dir>' and commit."

  exit 1
else
  echo "✅ Hygiene check passed. No forbidden directories are tracked."

  mkdir -p artifacts/runnability-audit-2026-02-26
  echo '{"status":"passed","drift":[]}' > artifacts/runnability-audit-2026-02-26/report.json
  exit 0
fi
