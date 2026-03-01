#!/usr/bin/env bash
# Generate a deterministic supply-chain evidence ID.
# Usage: evidence_id.sh <target>
set -euo pipefail

TARGET="${1:?Usage: evidence_id.sh <target>}"
TIMESTAMP=$(date +%s)
HASH=$(printf '%s-%s' "$TIMESTAMP" "$TARGET" | sha256sum | cut -c1-12)
RUNID=$(echo "$TIMESTAMP" | base64 | tr '+/' '-_' | tr -d '=')

printf 'sc-%s-%s-%s\n' "$HASH" "$RUNID" "$TARGET"
