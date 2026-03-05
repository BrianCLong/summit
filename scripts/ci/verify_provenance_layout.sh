#!/usr/bin/env bash
set -euo pipefail

usage() {
  echo "usage: $0 <image@digest> <layout.json>" >&2
}

if [[ $# -ne 2 ]]; then
  usage
  exit 2
fi

IMAGE_REF="$1"
LAYOUT_PATH="$2"
OIDC_ISSUER="${COSIGN_OIDC_ISSUER:-https://token.actions.githubusercontent.com}"
IDENTITY_REGEX="${COSIGN_IDENTITY_REGEX:-^https://github.com/.+/\\.github/workflows/.+@.+$}"
REKOR_URL="${COSIGN_REKOR_URL:-https://rekor.sigstore.dev}"

for cmd in cosign jq sha256sum; do
  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo "missing required command: $cmd" >&2
    exit 1
  fi
done

if [[ ! -f "$LAYOUT_PATH" ]]; then
  echo "layout file not found: $LAYOUT_PATH" >&2
  exit 1
fi

if ! jq -e '.type == "layout" and (.steps | type == "array" and length > 0)' "$LAYOUT_PATH" >/dev/null; then
  echo "invalid layout file: $LAYOUT_PATH" >&2
  exit 1
fi

LAYOUT_DIR="$(cd "$(dirname "$LAYOUT_PATH")" && pwd)"
mapfile -t STAGES < <(jq -r '.steps[].name' "$LAYOUT_PATH")

echo "Validating expected stage materials from layout..."
while IFS=$'\t' read -r stage material; do
  [[ -z "$material" ]] && continue
  file_name="${material#*:}"
  if [[ "$file_name" == "$material" ]]; then
    file_name="$material"
  fi
  file_path="${LAYOUT_DIR}/${file_name}"
  if [[ ! -f "$file_path" ]]; then
    echo "missing material for stage '${stage}': ${file_name}" >&2
    exit 1
  fi
  hash="$(sha256sum "$file_path" | awk '{print $1}')"
  echo "  - ${stage}: ${file_name} sha256=${hash}"
done < <(jq -r '.steps[] | .name as $name | (.expectedMaterials // [])[]? | [$name, .] | @tsv' "$LAYOUT_PATH")

attestation_json="$(mktemp)"
trap 'rm -f "$attestation_json"' EXIT

echo "Verifying in-toto attestations for ${IMAGE_REF}..."
cosign verify-attestation --use-signed-timestamps --type in-toto "${IMAGE_REF}" \
  --certificate-oidc-issuer "${OIDC_ISSUER}" \
  --certificate-identity-regexp "${IDENTITY_REGEX}" \
  --rekor-url "${REKOR_URL}" \
  --output json > "${attestation_json}"

for stage in "${STAGES[@]}"; do
  count="$(
    jq -r --arg stage "$stage" '
      [
        .[]
        | (.payload // .Payload // empty)
        | select(length > 0)
        | @base64d
        | fromjson
        | select(
            (.predicate.stage // "") == $stage
            or (.predicate.metadata.stage // "") == $stage
          )
      ] | length
    ' "${attestation_json}"
  )"
  if [[ "$count" -lt 1 ]]; then
    echo "missing verified in-toto attestation for stage '${stage}'" >&2
    exit 1
  fi
  echo "  - verified stage '${stage}' (${count} matching attestation(s))"
done

echo "Provenance layout verification passed."
