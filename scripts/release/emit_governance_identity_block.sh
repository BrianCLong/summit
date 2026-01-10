#!/usr/bin/env bash
#
# emit_governance_identity_block.sh - Generate governance identity markdown block
#
# Produces a standardized markdown block for release notes showing governance
# hash, signature status, and optionally authenticity verification status.
#
# Usage:
#   ./emit_governance_identity_block.sh --bundle-dir ./artifacts/ga-bundles/v4.1.2 --mode ga
#   ./emit_governance_identity_block.sh --bundle-dir ./artifacts/promotion-bundles/v4.1.2-rc.1 --mode rc
#
# Options:
#   --bundle-dir DIR    Bundle directory containing governance files (required)
#   --mode MODE         Release mode: ga or rc (required)
#   --verify            Attempt signature verification if cosign available
#   --json              Output as JSON instead of markdown
#   --help              Show this help message
#
# Output:
#   Markdown block suitable for inclusion in release notes:
#
#   ### Governance Identity
#   - **Governance Hash:** `ab8b3bb2588620c...`
#   - **Governance Signature:** SIGNED
#   - **Authenticity:** VERIFIED
#
# Authority: docs/ci/GOVERNANCE_STAMPING.md

set -euo pipefail

SCRIPT_VERSION="1.0.0"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Configuration
BUNDLE_DIR=""
MODE=""
VERIFY=false
JSON_OUTPUT=false

show_help() {
    cat << EOF
emit_governance_identity_block.sh v${SCRIPT_VERSION}

Generate governance identity markdown block for release notes.

Usage:
  $(basename "$0") --bundle-dir DIR --mode MODE [options]

Options:
  --bundle-dir DIR    Bundle directory containing governance files (required)
  --mode MODE         Release mode: ga or rc (required)
  --verify            Attempt signature verification if cosign available
  --json              Output as JSON instead of markdown
  --help              Show this help message

Output:
  Markdown block with governance hash, signature status, and optionally
  authenticity verification status.

Examples:
  # GA bundle
  $(basename "$0") --bundle-dir ./artifacts/ga-bundles/v4.1.2 --mode ga

  # RC bundle with verification
  $(basename "$0") --bundle-dir ./artifacts/promotion-bundles/v4.1.2-rc.1 --mode rc --verify

  # JSON output
  $(basename "$0") --bundle-dir ./bundle --mode ga --json
EOF
}

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --bundle-dir)
            BUNDLE_DIR="$2"
            shift 2
            ;;
        --mode)
            MODE="$2"
            shift 2
            ;;
        --verify)
            VERIFY=true
            shift
            ;;
        --json)
            JSON_OUTPUT=true
            shift
            ;;
        --help)
            show_help
            exit 0
            ;;
        *)
            echo "ERROR: Unknown option: $1" >&2
            show_help
            exit 2
            ;;
    esac
done

# Validate required arguments
if [[ -z "$BUNDLE_DIR" ]]; then
    echo "ERROR: Missing required argument: --bundle-dir" >&2
    exit 2
fi

if [[ -z "$MODE" ]]; then
    echo "ERROR: Missing required argument: --mode" >&2
    exit 2
fi

if [[ "$MODE" != "ga" && "$MODE" != "rc" ]]; then
    echo "ERROR: Invalid mode: ${MODE}. Must be 'ga' or 'rc'" >&2
    exit 2
fi

if [[ ! -d "$BUNDLE_DIR" ]]; then
    echo "ERROR: Bundle directory not found: ${BUNDLE_DIR}" >&2
    exit 2
fi

# Compute governance hash
GOVERNANCE_HASH=""
if [[ -f "${BUNDLE_DIR}/governance/governance_lockfile.json" ]]; then
    GOVERNANCE_HASH=$(sha256sum "${BUNDLE_DIR}/governance/governance_lockfile.json" | cut -d' ' -f1)
elif [[ -f "${BUNDLE_DIR}/governance/governance_SHA256SUMS" ]]; then
    # Extract from SHA256SUMS if lockfile not present
    GOVERNANCE_HASH=$(grep "governance_lockfile.json" "${BUNDLE_DIR}/governance/governance_SHA256SUMS" | cut -d' ' -f1 || echo "")
fi

if [[ -z "$GOVERNANCE_HASH" ]]; then
    GOVERNANCE_HASH="not_available"
fi

# Determine signature status
SIGNATURE_STATUS="UNSIGNED"
SIGNATURE_METHOD=""
if [[ -f "${BUNDLE_DIR}/governance/signatures/metadata.json" ]]; then
    SIGNATURE_METHOD=$(jq -r '.method // "unknown"' "${BUNDLE_DIR}/governance/signatures/metadata.json" 2>/dev/null || echo "unknown")
    if [[ "$SIGNATURE_METHOD" == "sigstore-cosign-oidc" ]]; then
        # Check if actual signature files exist
        if [[ -f "${BUNDLE_DIR}/governance/signatures/governance_SHA256SUMS.sig" && \
              -f "${BUNDLE_DIR}/governance/signatures/governance_SHA256SUMS.cert" ]]; then
            SIGNATURE_STATUS="SIGNED"
        fi
    elif [[ "$SIGNATURE_METHOD" == "unsigned" ]]; then
        SIGNATURE_STATUS="UNSIGNED"
    fi
elif [[ -d "${BUNDLE_DIR}/governance/signatures" ]]; then
    # Check for signature files directly
    if [[ -f "${BUNDLE_DIR}/governance/signatures/governance_SHA256SUMS.sig" ]]; then
        SIGNATURE_STATUS="SIGNED"
    fi
fi

# Determine authenticity status
AUTHENTICITY_STATUS="UNKNOWN"
AUTHENTICITY_REASON=""

if [[ "$VERIFY" == "true" ]]; then
    if [[ "$SIGNATURE_STATUS" == "SIGNED" ]]; then
        if command -v cosign &>/dev/null; then
            SIG_FILE="${BUNDLE_DIR}/governance/signatures/governance_SHA256SUMS.sig"
            CERT_FILE="${BUNDLE_DIR}/governance/signatures/governance_SHA256SUMS.cert"
            SUBJECT_FILE="${BUNDLE_DIR}/governance/governance_SHA256SUMS"

            if [[ -f "$SIG_FILE" && -f "$CERT_FILE" && -f "$SUBJECT_FILE" ]]; then
                export COSIGN_EXPERIMENTAL=1
                if cosign verify-blob \
                    --signature "$SIG_FILE" \
                    --certificate "$CERT_FILE" \
                    --certificate-oidc-issuer "https://token.actions.githubusercontent.com" \
                    --certificate-identity-regexp "https://github.com/.*/summit/.github/workflows/.*" \
                    "$SUBJECT_FILE" &>/dev/null; then
                    AUTHENTICITY_STATUS="VERIFIED"
                    AUTHENTICITY_REASON="Identity pinning passed"
                else
                    AUTHENTICITY_STATUS="NOT_VERIFIED"
                    AUTHENTICITY_REASON="Verification failed"
                fi
            else
                AUTHENTICITY_STATUS="NOT_VERIFIED"
                AUTHENTICITY_REASON="Missing signature files"
            fi
        else
            AUTHENTICITY_STATUS="UNKNOWN"
            AUTHENTICITY_REASON="cosign not available"
        fi
    else
        AUTHENTICITY_STATUS="NOT_VERIFIED"
        AUTHENTICITY_REASON="Bundle is unsigned"
    fi
else
    # For GA mode, default to attempting verification
    if [[ "$MODE" == "ga" && "$SIGNATURE_STATUS" == "SIGNED" ]]; then
        if command -v cosign &>/dev/null; then
            SIG_FILE="${BUNDLE_DIR}/governance/signatures/governance_SHA256SUMS.sig"
            CERT_FILE="${BUNDLE_DIR}/governance/signatures/governance_SHA256SUMS.cert"
            SUBJECT_FILE="${BUNDLE_DIR}/governance/governance_SHA256SUMS"

            if [[ -f "$SIG_FILE" && -f "$CERT_FILE" && -f "$SUBJECT_FILE" ]]; then
                export COSIGN_EXPERIMENTAL=1
                if cosign verify-blob \
                    --signature "$SIG_FILE" \
                    --certificate "$CERT_FILE" \
                    --certificate-oidc-issuer "https://token.actions.githubusercontent.com" \
                    --certificate-identity-regexp "https://github.com/.*/summit/.github/workflows/.*" \
                    "$SUBJECT_FILE" &>/dev/null; then
                    AUTHENTICITY_STATUS="VERIFIED"
                else
                    AUTHENTICITY_STATUS="NOT_VERIFIED"
                fi
            fi
        fi
    fi
fi

# Output
if [[ "$JSON_OUTPUT" == "true" ]]; then
    cat << EOF
{
  "version": "${SCRIPT_VERSION}",
  "mode": "${MODE}",
  "governance_hash": "${GOVERNANCE_HASH}",
  "signature_status": "${SIGNATURE_STATUS}",
  "signature_method": "${SIGNATURE_METHOD:-none}",
  "authenticity_status": "${AUTHENTICITY_STATUS}",
  "authenticity_reason": "${AUTHENTICITY_REASON:-none}"
}
EOF
else
    # Generate markdown block
    cat << EOF

### Governance Identity

- **Governance Hash:** \`${GOVERNANCE_HASH}\`
- **Governance Signature:** ${SIGNATURE_STATUS}
EOF

    # Include authenticity only if we have meaningful info
    if [[ "$AUTHENTICITY_STATUS" != "UNKNOWN" || "$VERIFY" == "true" ]]; then
        echo "- **Authenticity:** ${AUTHENTICITY_STATUS}"
    fi

    # Add verification hint
    cat << EOF

<details>
<summary>Verification</summary>

\`\`\`bash
# Verify governance hash
sha256sum governance/governance_lockfile.json
# Expected: ${GOVERNANCE_HASH}
EOF

    if [[ "$SIGNATURE_STATUS" == "SIGNED" ]]; then
        cat << EOF

# Verify signature (requires cosign)
cosign verify-blob \\
  --signature governance/signatures/governance_SHA256SUMS.sig \\
  --certificate governance/signatures/governance_SHA256SUMS.cert \\
  --certificate-oidc-issuer "https://token.actions.githubusercontent.com" \\
  --certificate-identity-regexp "https://github.com/.*/summit/.github/workflows/.*" \\
  governance/governance_SHA256SUMS
EOF
    fi

    cat << EOF
\`\`\`

</details>
EOF
fi
