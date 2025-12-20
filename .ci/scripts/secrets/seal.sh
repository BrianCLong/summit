#!/usr/bin/env bash
set -euo pipefail

ENVIRONMENT=${1:-dev}
ACTOR=${2:-github-actions}
TMPDIR=$(mktemp -d)
AUDIT_LOG=/tmp/secrets-audit.json

cleanup() {
  rm -rf "$TMPDIR"
}
trap cleanup EXIT

if [[ -z "${KUBESEAL_CERT:-}" ]]; then
  echo "KUBESEAL_CERT is required" >&2
  exit 1
fi

# Load age key for SOPS
export SOPS_AGE_KEY="${AGE_ORG_PRIVATE_KEY:-}"

# Decrypt per-environment files to a temp workspace only
find "secrets/envs/${ENVIRONMENT}" -name '*.enc.yaml' -print0 | while IFS= read -r -d '' file; do
  basename=$(basename "$file" .enc.yaml)
  tmp_plain="${TMPDIR}/${basename}.yaml"
  sops -d "$file" > "$tmp_plain"
  namespace=$(yq '.metadata.namespace' "$tmp_plain")
  secret_name=$(yq '.metadata.name' "$tmp_plain")
  kubeseal --cert <(echo "$KUBESEAL_CERT") --format yaml < "$tmp_plain" > "deploy/helm/intelgraph/secrets/${basename}-${ENVIRONMENT}.sealed.yaml"
  rm -f "$tmp_plain"
  echo "{""actor"": ""${ACTOR}"", ""path"": ""$file"", ""sealed"": ""deploy/helm/intelgraph/secrets/${basename}-${ENVIRONMENT}.sealed.yaml"", ""hash"": ""$(sha256sum "$file" | cut -d' ' -f1)"", ""namespace"": ""$namespace"", ""name"": ""$secret_name"", ""timestamp"": ""$(date -Iseconds)""}" >> "$AUDIT_LOG"
done

chmod 0600 "$AUDIT_LOG"
