#!/usr/bin/env bash
set -euo pipefail

jq -n \
  --arg sha "$(git rev-parse HEAD)" \
  --arg ref "$(git symbolic-ref --short HEAD)" \
  --arg time "$(date -u +%FT%TZ)" \
  '{
    commit: $sha,
    ref: $ref,
    generated_at: $time,
    workflow: "terraform-deploy"
  }'
