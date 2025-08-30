#!/usr/bin/env bash
set -euo pipefail
[ -f ".orchestra.env" ] && set -a && . ./.orchestra.env && set +a


# tolerate accidental key=value style
MODEL_DEFAULT="${1:-local/llama}"; shift || true
PROMPT="${*:-Say exactly six words.}"

# tolerate accidental key=value style
[[ "$MODEL_DEFAULT"  == MODEL=* ]] && MODEL_DEFAULT="${MODEL_DEFAULT#MODEL=}"
[[ "$PROMPT" == q=*     ]] && PROMPT="${PROMPT#q=}"

# Read policy.json
POLICY_JSON=$(cat "$(dirname "$0")/policy.json")

# Initialize variables with defaults
MODEL="$MODEL_DEFAULT"
TEMPERATURE="0.0"
MAX_TOKENS="64"
SYSTEM_PROMPT='You are terse. Output exactly what is requested. 
No preface, no lists, no punctuation, no emojis, no code fences.'

# Override based on TASK
if [[ -n "${TASK:-}" ]]; then
  TASK_CONFIG=$(echo "$POLICY_JSON" | jq -r ".tasks["$TASK"] // empty")
  if [[ -n "$TASK_CONFIG" ]]; then
    MODEL=$(echo "$TASK_CONFIG" | jq -r ".model // "$MODEL"")
    TEMPERATURE=$(echo "$TASK_CONFIG" | jq -r ".temp // "$TEMPERATURE"")
    MAX_TOKENS=$(echo "$TASK_CONFIG" | jq -r ".max_tokens // "$MAX_TOKENS"")
    # For embed task, we might need to handle 'dim' instead of max_tokens
    if [[ "$TASK" == "embed" ]]; then
      DIM=$(echo "$TASK_CONFIG" | jq -r ".dim // empty")
      if [[ -n "$DIM" ]]; then
        # Handle embed specific parameters if needed, for now just model
        : # No specific changes to JSON for embed other than model
      fi
    fi
  fi
fi


JSON=$( \
  jq -nc --arg m "$MODEL" --arg p "$PROMPT" --arg sys "$SYSTEM_PROMPT" \
  --argjson temp "$TEMPERATURE" --argjson max_t "$MAX_TOKENS" \
  '{model:$m, temperature:$temp, top_p:0.0, max_tokens:$max_t, messages:[{role:"system",content:$sys},{role:"user",content:$p}] }' \
)

curl -s -X POST http://127.0.0.1:4000/v1/chat/completions \
  -H 'Authorization: Bearer sk' -H 'Content-Type: application/json' \
  -d "$JSON" | jq -r '.choices[0].message.content // .choices[0].text // empty'
