#!/usr/bin/env bash
set -euo pipefail

IMAGE_REFERENCE="$1"
ARTIFACTS_DIR="artifacts"
mkdir -p "$ARTIFACTS_DIR"

if ! command -v cosign >/dev/null 2>&1; then
  echo "cosign is required to generate attestations" >&2
  exit 1
fi

PREDICATE_TEMPLATE="./docs/provenance-template.json"
PREDICATE_RENDERED="$(mktemp)"
if command -v envsubst >/dev/null 2>&1; then
  envsubst < "$PREDICATE_TEMPLATE" > "$PREDICATE_RENDERED"
else
  cp "$PREDICATE_TEMPLATE" "$PREDICATE_RENDERED"
fi

PROVENANCE_PATH="$ARTIFACTS_DIR/$(echo "$IMAGE_REFERENCE" | tr '/:' '__')-provenance.intoto.jsonl"
cosign attest --predicate-type slsa-provenance --predicate "$PREDICATE_RENDERED" "$IMAGE_REFERENCE" > "$PROVENANCE_PATH"
rm -f "$PREDICATE_RENDERED"
echo "Provenance written to $PROVENANCE_PATH"
