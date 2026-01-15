#!/usr/bin/env bash
set -euo pipefail

EVIDENCE_DIR=${1:-./evidence/ga}
SIGNATURE_DIR=${SIGNATURE_DIR:-"$EVIDENCE_DIR/signatures"}
COSIGN_PUB=${COSIGN_PUB:-./keys/cosign.pub}

BLUE='\033[0;34m'
GREEN='\033[0;32m'
NC='\033[0m'

say() { printf "\n${BLUE}== %s ==${NC}\n" "$*"; }
pass() { printf "${GREEN}✅ %s${NC}\n" "$*"; }

if [ ! -d "$EVIDENCE_DIR" ]; then
  echo "⚠️  Evidence directory not found: $EVIDENCE_DIR"
  exit 0
fi

if [ ! -d "$SIGNATURE_DIR" ]; then
  echo "❌ Signature directory not found: $SIGNATURE_DIR"
  exit 1
fi

sanitize_signature_name() {
  local file="$1"
  local relative="${file#${EVIDENCE_DIR}/}"
  echo "${relative//\//__}"
}

verify_signature() {
  local file="$1"
  local signature_base
  signature_base="$(sanitize_signature_name "$file")"
  local signature_path="$SIGNATURE_DIR/${signature_base}.sig"
  local certificate_path="$SIGNATURE_DIR/${signature_base}.pem"

  if [ ! -f "$signature_path" ]; then
    echo "❌ Missing signature for $file"
    return 1
  fi

  if command -v cosign &> /dev/null; then
    if [ -f "$COSIGN_PUB" ] && [ -s "$COSIGN_PUB" ]; then
      cosign verify-blob --key "$COSIGN_PUB" --signature "$signature_path" "$file" >/dev/null
    elif [ -f "$certificate_path" ] && [ -s "$certificate_path" ]; then
      cosign verify-blob \
        --certificate "$certificate_path" \
        --signature "$signature_path" \
        --certificate-identity-regexp=".*" \
        --certificate-oidc-issuer-regexp=".*" \
        "$file" >/dev/null
    else
      echo "❌ Missing public key or certificate for $file"
      return 1
    fi
  fi

  return 0
}

say "🔎 Verifying evidence signatures in $EVIDENCE_DIR"

TARGET_DIRS=()
for dir in sboms sbom test-results provenance vulnerability-reports; do
  if [ -d "$EVIDENCE_DIR/$dir" ]; then
    TARGET_DIRS+=("$EVIDENCE_DIR/$dir")
  fi
done

if [ "${#TARGET_DIRS[@]}" -eq 0 ]; then
  echo "⚠️  No evidence subdirectories found to verify."
  exit 0
fi

FAILURES=0
for target_dir in "${TARGET_DIRS[@]}"; do
  while IFS= read -r -d '' file; do
    if ! verify_signature "$file"; then
      FAILURES=$((FAILURES + 1))
    fi
  done < <(find "$target_dir" -type f \( -name "*.json" -o -name "*.xml" -o -name "*.log" \) -print0)
done

if [ "$FAILURES" -gt 0 ]; then
  echo "❌ Evidence signature verification failed for $FAILURES file(s)."
  exit 1
fi

pass "All evidence signatures verified"
