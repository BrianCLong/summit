#!/usr/bin/env bash
set -euo pipefail

STAGE=${STAGE:-unknown}
DIGEST=${DIGEST:-unknown}
SBOM_PATH=${SBOM_PATH:-}
REKOR_UUIDS=${REKOR_UUIDS:-unknown}
SUMMARY=${SUMMARY:-}
POLICY_JSON=${POLICY_JSON:-}
IMAGE_NAME=${IMAGE_NAME:-}

sbom_hash="absent"
if [ -n "$SBOM_PATH" ] && [ -f "$SBOM_PATH" ]; then
  sbom_hash=$(sha256sum "$SBOM_PATH" | cut -d' ' -f1)
fi

time_iso=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

policy_block="{}"
if [ -n "$POLICY_JSON" ]; then
  if echo "$POLICY_JSON" | jq empty >/dev/null 2>&1; then
    policy_block="$POLICY_JSON"
  else
    policy_block=$(jq -n --arg raw "$POLICY_JSON" '{raw:$raw, parse_error:true}')
  fi
fi

payload=$(jq -n \
  --arg stage "$STAGE" \
  --arg actor "${GITHUB_ACTOR:-unknown}" \
  --arg commit "${GITHUB_SHA:-unknown}" \
  --arg branch "${GITHUB_REF_NAME:-unknown}" \
  --arg repo "${GITHUB_REPOSITORY:-unknown}" \
  --arg workflow "${GITHUB_WORKFLOW:-unknown}" \
  --arg job "${GITHUB_JOB:-unknown}" \
  --arg run_id "${GITHUB_RUN_ID:-unknown}" \
  --arg run_attempt "${GITHUB_RUN_ATTEMPT:-unknown}" \
  --arg summary "$SUMMARY" \
  --arg digest "$DIGEST" \
  --arg sbom_hash "$sbom_hash" \
  --arg rekor "$REKOR_UUIDS" \
  --arg image "$IMAGE_NAME" \
  --arg timestamp "$time_iso" \
  --arg build_url "https://github.com/${GITHUB_REPOSITORY:-unknown}/actions/runs/${GITHUB_RUN_ID:-unknown}" \
  --argjson policy "$policy_block" \
  '{timestamp:$timestamp, stage:$stage, actor:$actor, commit:$commit, branch:$branch, repo:$repo, workflow:$workflow, job:$job, run_id:$run_id, run_attempt:$run_attempt, build_url:$build_url, image:$image, digest:$digest, sbom_sha256:$sbom_hash, rekor_uuid:$rekor, summary:$summary, policy:$policy}'
)

mkdir -p artifacts/telemetry
log_file="artifacts/telemetry/supply-chain-telemetry.jsonl"
printf '%s\n' "$payload" >> "$log_file"

if [ -n "${GITHUB_STEP_SUMMARY:-}" ]; then
  {
    echo "### Supply Chain Telemetry (${STAGE})"
    echo
    echo '\`\`\`json'
    echo "$payload" | jq '.'
    echo '\`\`\`'
  } >> "$GITHUB_STEP_SUMMARY"
fi

if [ -n "${OTEL_EXPORTER_OTLP_ENDPOINT:-}" ]; then
  trace_id=$(openssl rand -hex 16)
  span_id=$(openssl rand -hex 8)
  now_ns=$(($(date +%s%N)))
  end_ns=$((now_ns + 1_000_000))

  otel_payload=$(echo "$payload" | jq -c --arg tid "$trace_id" --arg sid "$span_id" --arg start "$now_ns" --arg end "$end_ns" '{
    resourceSpans: [{
      resource: {
        attributes: [
          {key:"service.name", value:{stringValue:"ci-supply-chain"}},
          {key:"ci.stage", value:{stringValue:.stage}},
          {key:"ci.repo", value:{stringValue:.repo}}
        ]
      },
      scopeSpans: [{
        scope: {name:"supply-chain-telemetry"},
        spans: [{
          traceId: $tid,
          spanId: $sid,
          name: (.stage + "-verification"),
          kind: 1,
          startTimeUnixNano: $start,
          endTimeUnixNano: $end,
          attributes: (to_entries | map({key:.key, value:{stringValue:(.value|tostring)}}))
        }]
      }]
    }]
  }')

  otel_headers=("-H" "Content-Type: application/json")
  if [ -n "${OTEL_EXPORTER_OTLP_HEADERS:-}" ]; then
    IFS="," read -r -a header_pairs <<<"${OTEL_EXPORTER_OTLP_HEADERS}"
    for header in "${header_pairs[@]}"; do
      otel_headers+=("-H" "$header")
    done
  fi

  curl -sSf -X POST "${OTEL_EXPORTER_OTLP_ENDPOINT%/}/v1/traces" -d "$otel_payload" "${otel_headers[@]}" \
    || echo "OTEL export failed (non-blocking)" >&2
fi
