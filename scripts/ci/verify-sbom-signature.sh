#!/bin/bash
set -u -o pipefail

IMAGE_REF=${1:-}
RECEIPT_DIR=${2:-artifacts/compliance-receipts}

if [ -z "$IMAGE_REF" ]; then
  echo "Usage: $0 <image_ref> [receipt_dir]" >&2
  exit 1
fi

EXPECTED_OIDC_ISSUER=${EXPECTED_OIDC_ISSUER:-"https://token.actions.githubusercontent.com"}
EXPECTED_IDENTITY_REGEX=${EXPECTED_IDENTITY_REGEX:-"^https://github.com/.+/.github/workflows/.+@.*$"}

TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
SAFE_TIMESTAMP=$(echo "$TIMESTAMP" | tr ':' '-')
mkdir -p "$RECEIPT_DIR"

receipt_path="$RECEIPT_DIR/supply-chain-verification-$SAFE_TIMESTAMP.json"

PASS=true
FAILURES=()

if ! command -v cosign >/dev/null 2>&1; then
  PASS=false
  FAILURES+=("cosign_missing")
else
  VERIFY_ARGS=()
  if [ -n "${COSIGN_PUBLIC_KEY:-}" ]; then
    VERIFY_ARGS+=(--key "$COSIGN_PUBLIC_KEY")
  else
    VERIFY_ARGS+=(--certificate-identity-regexp "$EXPECTED_IDENTITY_REGEX")
    VERIFY_ARGS+=(--certificate-oidc-issuer "$EXPECTED_OIDC_ISSUER")
  fi

  signature_log="$RECEIPT_DIR/supply-chain-signature-$SAFE_TIMESTAMP.log"
  sbom_cdx_log="$RECEIPT_DIR/supply-chain-sbom-cyclonedx-$SAFE_TIMESTAMP.log"
  sbom_spdx_log="$RECEIPT_DIR/supply-chain-sbom-spdx-$SAFE_TIMESTAMP.log"

  if cosign verify "$IMAGE_REF" "${VERIFY_ARGS[@]}" >"$signature_log" 2>&1; then
    signature_status="passed"
  else
    signature_status="failed"
    PASS=false
    FAILURES+=("signature_verification_failed")
  fi

  if cosign verify-attestation "$IMAGE_REF" --type cyclonedx "${VERIFY_ARGS[@]}" >"$sbom_cdx_log" 2>&1; then
    sbom_cdx_status="passed"
  else
    sbom_cdx_status="failed"
    PASS=false
    FAILURES+=("sbom_cyclonedx_attestation_failed")
  fi

  if cosign verify-attestation "$IMAGE_REF" --type spdxjson "${VERIFY_ARGS[@]}" >"$sbom_spdx_log" 2>&1; then
    sbom_spdx_status="passed"
  else
    sbom_spdx_status="failed"
    PASS=false
    FAILURES+=("sbom_spdx_attestation_failed")
  fi
fi

cat > "$receipt_path" <<'RECEIPT'
{
  "receipt_type": "supply_chain_verification",
  "timestamp": "__TIMESTAMP__",
  "image": "__IMAGE__",
  "checks": {
    "signature": {
      "status": "__SIGNATURE_STATUS__",
      "log": "__SIGNATURE_LOG__"
    },
    "sbom_cyclonedx": {
      "status": "__SBOM_CDX_STATUS__",
      "log": "__SBOM_CDX_LOG__"
    },
    "sbom_spdxjson": {
      "status": "__SBOM_SPDX_STATUS__",
      "log": "__SBOM_SPDX_LOG__"
    }
  },
  "overall_status": "__OVERALL_STATUS__",
  "failures": [__FAILURES__]
}
RECEIPT

escaped_failures=""
if [ ${#FAILURES[@]} -gt 0 ]; then
  escaped_failures=$(printf '"%s",' "${FAILURES[@]}")
  escaped_failures="${escaped_failures%,}"
fi

sed -i \
  -e "s|__TIMESTAMP__|$TIMESTAMP|" \
  -e "s|__IMAGE__|$IMAGE_REF|" \
  -e "s|__SIGNATURE_STATUS__|${signature_status:-failed}|" \
  -e "s|__SIGNATURE_LOG__|${signature_log:-}|" \
  -e "s|__SBOM_CDX_STATUS__|${sbom_cdx_status:-failed}|" \
  -e "s|__SBOM_CDX_LOG__|${sbom_cdx_log:-}|" \
  -e "s|__SBOM_SPDX_STATUS__|${sbom_spdx_status:-failed}|" \
  -e "s|__SBOM_SPDX_LOG__|${sbom_spdx_log:-}|" \
  -e "s|__OVERALL_STATUS__|$( [ "$PASS" = true ] && echo "passed" || echo "failed" )|" \
  -e "s|__FAILURES__|${escaped_failures}|" \
  "$receipt_path"

if [ "$PASS" = true ]; then
  echo "✅ Supply chain verification passed. Receipt: $receipt_path"
  exit 0
fi

echo "❌ Supply chain verification failed. Receipt: $receipt_path" >&2
exit 1
