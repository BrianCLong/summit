#!/usr/bin/env bash
set -euo pipefail

# Evidence Signing Script
# Signs compliance evidence with cosign for verification

EVIDENCE_DIR=${EVIDENCE_DIR:-./evidence/ga}
OUTPUT_DIR=${OUTPUT_DIR:-$EVIDENCE_DIR/signatures}
COSIGN_KEY=${COSIGN_KEY:-./keys/cosign.key}
COSIGN_PUB=${COSIGN_PUB:-./keys/cosign.pub}

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

say() { printf "\n${BLUE}== %s ==${NC}\n" "$*"; }
pass() { printf "${GREEN}✅ %s${NC}\n" "$*"; }

sanitize_signature_name() {
    local file="$1"
    local relative="${file#${EVIDENCE_DIR}/}"
    echo "${relative//\//__}"
}

# Sign evidence
sign_evidence() {
    local file="$1"
    local signature_base
    signature_base="$(sanitize_signature_name "$file")"
    local signature_path="$OUTPUT_DIR/${signature_base}.sig"
    local certificate_path="$OUTPUT_DIR/${signature_base}.pem"
    local attestation_path="$OUTPUT_DIR/${signature_base}.attestation.json"

    say "Signing $file"

    # Calculate hash
    local hash=$(sha256sum "$file" | awk '{print $1}')

    # Create signature
    # Mocking cosign if not available for dry run
    if command -v cosign &> /dev/null; then
        if [ -f "$COSIGN_KEY" ] && [ -s "$COSIGN_KEY" ]; then
            cosign sign-blob --key "$COSIGN_KEY" "$file" --output-signature "$signature_path"
        else
            cosign sign-blob --yes "$file" --output-signature "$signature_path" --output-certificate "$certificate_path"
        fi
    else
        echo "Mock signing $file"
        echo "mock-signature" > "$signature_path"
    fi

    # Create attestation wrapper (simplified)
    cat > "$attestation_path" << EOF
{
  "_type": "https://in-toto.io/Statement/v0.1",
  "subject": [{
    "name": "$(basename "$file")",
    "digest": {
      "sha256": "$hash"
    }
  }],
  "predicateType": "https://slsa.dev/provenance/v0.2",
  "predicate": {
    "builder": {
      "id": "https://github.com/Summit/Summit/actions/runs/${GITHUB_RUN_ID:-manual}"
    },
    "metadata": {
      "buildFinishedOn": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
    }
  }
}
EOF

    pass "Signed $(basename "$file")"
}

# Main
main() {
    say "🔐 Evidence Signing Process"

    # Check if we are mocking keys (dry run)
    if [ "${COSIGN_KEY}" == "./keys/cosign.key" ] && [ ! -f "${COSIGN_KEY}" ]; then
       echo "Generating mock keys for dry run if needed..."
       mkdir -p ./keys
       touch ./keys/cosign.key
    fi

    mkdir -p "$EVIDENCE_DIR"
    mkdir -p "$OUTPUT_DIR"

    # Find all evidence files (json, xml, log)
    find "$EVIDENCE_DIR" -type f \( -name "*.json" -o -name "*.xml" -o -name "*.log" \) -not -name "*.sig" -not -name "*.attestation.json" | while read -r file; do
        sign_evidence "$file"
    done

    say "Evidence signing complete"
}

main
