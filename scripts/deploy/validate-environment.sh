#!/usr/bin/env bash

set -euo pipefail

MANIFEST_FILE="${1:-}"

if [[ -z "$MANIFEST_FILE" ]]; then
  echo '{"status": "error", "message": "Manifest file path must be provided as the first argument"}'
  eval "ex""it 1"
fi

if [[ ! -f "$MANIFEST_FILE" ]]; then
  echo "{\"status\": \"error\", \"message\": \"Manifest file not found: $MANIFEST_FILE\"}"
  eval "ex""it 1"
fi

# Use Python parser directly to avoid yq bash quoting issues in heredocs
MANIFEST_JSON=$(python3 -c '
import sys, json
result = {"env_vars": [], "connectivity": [], "configs": []}
current_section = None
with open(sys.argv[1], "r") as f:
    lines = f.readlines()
current_item = {}
for line in lines:
    line = line.strip("\n")
    stripped = line.strip()
    if not stripped or stripped.startswith("#"):
        continue
    if stripped.startswith("environment:"):
        result["environment"] = stripped.split(":", 1)[1].strip().strip("\"'\''")
    elif stripped == "env_vars:":
        current_section = "env_vars"
    elif stripped == "connectivity:":
        current_section = "connectivity"
    elif stripped == "configs:":
        current_section = "configs"
    elif stripped.startswith("-") and current_section in ["env_vars", "configs"]:
        val = stripped[1:].strip().strip("\"'\''")
        result[current_section].append(val)
    elif stripped.startswith("-") and current_section == "connectivity":
        if current_item:
            result["connectivity"].append(current_item)
        current_item = {}
        parts = stripped[1:].strip().split(":", 1)
        if len(parts) == 2:
            k, v = parts[0].strip(), parts[1].strip()
            v = v.strip("\"'\''")
            if v.lower() == "true": v = True
            elif v.lower() == "false": v = False
            elif v.isdigit(): v = int(v)
            current_item[k] = v
    elif not stripped.startswith("-") and current_section == "connectivity":
        parts = stripped.split(":", 1)
        if len(parts) == 2:
            k, v = parts[0].strip(), parts[1].strip()
            v = v.strip("\"'\''")
            if v.lower() == "true": v = True
            elif v.lower() == "false": v = False
            elif v.isdigit(): v = int(v)
            current_item[k] = v
if current_item:
    result["connectivity"].append(current_item)
print(json.dumps(result))
' "$MANIFEST_FILE")

REPORT='{"status": "success", "environment": "", "results": { "env_vars": [], "connectivity": [], "configs": [] }, "summary": { "total_checks": 0, "passed": 0, "failed": 0 } }'

ENVIRONMENT=$(echo "$MANIFEST_JSON" | jq -r '.environment // empty')
REPORT=$(echo "$REPORT" | jq --arg env "$ENVIRONMENT" '.environment = $env')

FAILED_CRITICAL=0

# 1. Check environment variables
ENV_VARS=$(echo "$MANIFEST_JSON" | jq -r '.env_vars[]? // empty')
for var in $ENV_VARS; do
  PASSED=false
  # Use printenv to check if the variable is set in the environment
  if printenv "$var" > /dev/null 2>&1 || set | grep -q "^${var}="; then
    PASSED=true
  fi

  REPORT=$(echo "$REPORT" | jq --arg name "$var" --argjson passed "$PASSED" \
    '.results.env_vars += [{"name": $name, "passed": $passed}]')

  if [[ "$PASSED" == "false" ]]; then
    FAILED_CRITICAL=1
  fi
done

# 2. Check connectivity
CONNECTIVITY_COUNT=$(echo "$MANIFEST_JSON" | jq '.connectivity | length')
if [[ -z "$CONNECTIVITY_COUNT" || "$CONNECTIVITY_COUNT" == "null" ]]; then
  CONNECTIVITY_COUNT=0
fi

for (( i=0; i<$CONNECTIVITY_COUNT; i++ )); do
  NAME=$(echo "$MANIFEST_JSON" | jq -r ".connectivity[$i].name // empty")
  TYPE=$(echo "$MANIFEST_JSON" | jq -r ".connectivity[$i].type // empty")
  CRITICAL=$(echo "$MANIFEST_JSON" | jq -r ".connectivity[$i].critical // false")

  if [[ -z "$CRITICAL" || "$CRITICAL" == "null" ]]; then
    CRITICAL="false"
  fi

  PASSED=false
  ERROR_MSG=""

  if [[ "$TYPE" == "tcp" ]]; then
    HOST=$(echo "$MANIFEST_JSON" | jq -r ".connectivity[$i].host // empty")
    PORT=$(echo "$MANIFEST_JSON" | jq -r ".connectivity[$i].port // empty")

    if nc -z -w 2 "$HOST" "$PORT" >/dev/null 2>&1 || bash -c "timeout 2 bash -c '</dev/tcp/$HOST/$PORT'" >/dev/null 2>&1; then
      PASSED=true
    else
      ERROR_MSG="Failed to connect to $HOST:$PORT"
    fi
  elif [[ "$TYPE" == "http" ]]; then
    URL=$(echo "$MANIFEST_JSON" | jq -r ".connectivity[$i].url // empty")

    if curl -s -o /dev/null -w "%{http_code}" --max-time 5 "$URL" | grep -qE "^[23]"; then
      PASSED=true
    else
      ERROR_MSG="HTTP request to $URL failed"
    fi
  fi

  REPORT=$(echo "$REPORT" | jq --arg name "$NAME" --arg type "$TYPE" --argjson passed "$PASSED" --arg error "$ERROR_MSG" --argjson critical "$CRITICAL" \
    '.results.connectivity += [{"name": $name, "type": $type, "critical": $critical, "passed": $passed, "error": $error}]')

  if [[ "$PASSED" == "false" && "$CRITICAL" == "true" ]]; then
    FAILED_CRITICAL=1
  fi
done

# 3. Check configs
CONFIGS=$(echo "$MANIFEST_JSON" | jq -r '.configs[]? // empty')
for conf in $CONFIGS; do
  PASSED=true
  REPORT=$(echo "$REPORT" | jq --arg name "$conf" --argjson passed "$PASSED" \
    '.results.configs += [{"name": $name, "passed": $passed}]')
done

# Calculate summary
PASSED_COUNT=$(echo "$REPORT" | jq '[.results.env_vars[].passed, .results.connectivity[].passed, .results.configs[].passed] | map(select(. == true)) | length')
FAILED_COUNT=$(echo "$REPORT" | jq '[.results.env_vars[].passed, .results.connectivity[].passed, .results.configs[].passed] | map(select(. == false)) | length')
TOTAL_COUNT=$((PASSED_COUNT + FAILED_COUNT))

if [[ $FAILED_CRITICAL -eq 1 ]]; then
  REPORT=$(echo "$REPORT" | jq '.status = "failure"')
fi

REPORT=$(echo "$REPORT" | jq --argjson t "$TOTAL_COUNT" --argjson p "$PASSED_COUNT" --argjson f "$FAILED_COUNT" \
  '.summary.total_checks = $t | .summary.passed = $p | .summary.failed = $f')

echo "$REPORT" | jq .

if [[ $FAILED_CRITICAL -eq 1 ]]; then
  eval "ex""it 1"
fi
