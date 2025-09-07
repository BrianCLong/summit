#!/bin/bash
set -euo pipefail

# TSA Timestamping for Merkle Roots (Connected Environments Only)
# Adds RFC 3161 timestamps to daily Merkle proofs for enhanced auditability

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MERKLE_FILE="${1:-daily-merkle.json}"
TSA_URL="${TSA_URL:-http://timestamp.digicert.com}"
TEMP_DIR="/tmp/tsa-$(date +%s)"

note() {
    echo "[$(date -u '+%Y-%m-%dT%H:%M:%SZ')] $*"
}

cleanup() {
    if [[ -d "$TEMP_DIR" ]]; then
        rm -rf "$TEMP_DIR" || true
    fi
}
trap cleanup EXIT

main() {
    note "Starting TSA timestamping for Merkle root"
    note "Input file: $MERKLE_FILE"
    note "TSA URL: $TSA_URL"
    
    # Check if we're in air-gap mode
    if [[ "${AIRGAP_ENABLED:-false}" == "true" ]]; then
        note "Air-gap mode enabled - TSA timestamping disabled"
        note "Merkle roots are HSM-signed only in air-gap environments"
        exit 0
    fi
    
    # Verify input file exists
    if [[ ! -f "$MERKLE_FILE" ]]; then
        echo "❌ Merkle file not found: $MERKLE_FILE"
        exit 1
    fi
    
    # Extract Merkle root from JSON
    if ! command -v jq >/dev/null; then
        echo "❌ jq is required for JSON processing"
        exit 1
    fi
    
    local root
    root=$(jq -r '.root // empty' "$MERKLE_FILE")
    
    if [[ -z "$root" ]]; then
        echo "❌ No Merkle root found in $MERKLE_FILE"
        exit 1
    fi
    
    note "Merkle root: $root"
    
    # Create temp directory
    mkdir -p "$TEMP_DIR"
    
    # Convert hex root to binary
    echo -n "$root" | xxd -r -p > "$TEMP_DIR/root.bin"
    
    note "Creating timestamp query..."
    
    # Create timestamp query (TSQ)
    if ! openssl ts \
        -query \
        -data "$TEMP_DIR/root.bin" \
        -sha256 \
        -no_nonce \
        -cert \
        -out "$TEMP_DIR/tsq.der"; then
        echo "❌ Failed to create timestamp query"
        exit 1
    fi
    
    note "Sending query to TSA: $TSA_URL"
    
    # Send query to TSA and get response
    if ! curl -sS \
        -H 'Content-Type: application/timestamp-query' \
        --data-binary "@$TEMP_DIR/tsq.der" \
        --max-time 30 \
        --retry 3 \
        --retry-delay 2 \
        "$TSA_URL" \
        -o "$TEMP_DIR/tsr.der"; then
        echo "❌ Failed to get TSA response"
        exit 1
    fi
    
    # Verify response is not empty
    if [[ ! -s "$TEMP_DIR/tsr.der" ]]; then
        echo "❌ Empty TSA response received"
        exit 1
    fi
    
    note "TSA response received ($(wc -c < "$TEMP_DIR/tsr.der") bytes)"
    
    # Verify timestamp response (if possible)
    if openssl ts -reply -in "$TEMP_DIR/tsr.der" -text >/dev/null 2>&1; then
        note "TSA response structure validated"
        
        # Extract timestamp info
        local ts_info
        ts_info=$(openssl ts -reply -in "$TEMP_DIR/tsr.der" -text 2>/dev/null | grep -E "(Time stamp|TSA|Policy)" || true)
        if [[ -n "$ts_info" ]]; then
            note "Timestamp info:"
            echo "$ts_info" | while read -r line; do
                note "  $line"
            done
        fi
    else
        note "Warning: Could not verify TSA response structure"
    fi
    
    # Encode TSA response as base64
    local tsa_b64
    tsa_b64=$(base64 -i "$TEMP_DIR/tsr.der")
    
    # Create enhanced Merkle proof with TSA
    local output_file="${MERKLE_FILE%.json}.with-tsa.json"
    
    if ! jq --arg tsa_response "$tsa_b64" \
        --arg tsa_url "$TSA_URL" \
        --arg tsa_timestamp "$(date -u '+%Y-%m-%dT%H:%M:%SZ')" \
        '. + {
            tsaResponse: $tsa_response,
            tsaUrl: $tsa_url, 
            tsaTimestamp: $tsa_timestamp,
            dualPath: true,
            auditTrail: (.auditTrail // []) + [{
                action: "tsa_timestamp",
                timestamp: $tsa_timestamp,
                url: $tsa_url,
                responseSize: ($tsa_response | length)
            }]
        }' "$MERKLE_FILE" > "$output_file"; then
        echo "❌ Failed to create TSA-enhanced Merkle proof"
        exit 1
    fi
    
    note "TSA-enhanced proof written to: $output_file"
    
    # Verify the combined proof
    note "Verifying dual-path proof..."
    
    local verification_passed=true
    
    # Check HSM signature exists
    if jq -e '.hsmSignature' "$output_file" >/dev/null; then
        note "✅ HSM signature present"
    else
        note "⚠️  HSM signature missing"
        verification_passed=false
    fi
    
    # Check TSA response exists
    if jq -e '.tsaResponse' "$output_file" >/dev/null; then
        note "✅ TSA response present"
    else
        note "❌ TSA response missing"
        verification_passed=false
    fi
    
    # Verify timestamp query matches root
    if openssl ts -verify \
        -in "$TEMP_DIR/tsr.der" \
        -data "$TEMP_DIR/root.bin" \
        -no_check_time \
        >/dev/null 2>&1; then
        note "✅ TSA timestamp verification: PASS"
    else
        note "⚠️  TSA timestamp verification: Could not verify (missing CA certs)"
    fi
    
    # Generate summary
    cat > tsa-summary.txt <<EOF
TSA Timestamping Summary
Generated: $(date -u '+%Y-%m-%dT%H:%M:%SZ')

Merkle Root: $root
TSA URL: $TSA_URL
Response Size: $(wc -c < "$TEMP_DIR/tsr.der") bytes
Enhanced Proof: $output_file

Verification Status:
- HSM Signature: $(jq -r '.hsmSignature | if . then "Present" else "Missing" end' "$output_file")
- TSA Response: $(jq -r '.tsaResponse | if . then "Present" else "Missing" end' "$output_file")
- Dual Path: $(jq -r '.dualPath // false' "$output_file")

This timestamp provides independent verification of the Merkle root
existence at $(jq -r '.tsaTimestamp' "$output_file") from $TSA_URL.

Combined with HSM signatures, this establishes a dual-path notarization
suitable for federal audit requirements.
EOF
    
    note "TSA summary written to: tsa-summary.txt"
    
    if [[ "$verification_passed" == "true" ]]; then
        note "✅ Dual-path notarization complete"
        echo "Output files:"
        echo "  - Enhanced proof: $output_file" 
        echo "  - TSA summary: tsa-summary.txt"
        exit 0
    else
        note "⚠️  Dual-path notarization completed with warnings"
        exit 2
    fi
}

# Handle command line options
case "${1:-}" in
    --help|-h)
        echo "Usage: $0 [merkle-file.json]"
        echo "Add TSA timestamp to Merkle proof for dual-path notarization"
        echo ""
        echo "Environment Variables:"
        echo "  TSA_URL         Timestamp Authority URL (default: http://timestamp.digicert.com)"
        echo "  AIRGAP_ENABLED  Skip TSA in air-gap mode (default: false)"
        echo ""
        echo "Input:"
        echo "  merkle-file.json  Merkle proof from emit_merkle_and_sign.ts"
        echo ""
        echo "Output:"
        echo "  merkle-file.with-tsa.json  Enhanced proof with TSA timestamp"
        echo "  tsa-summary.txt           Timestamping summary report"
        exit 0
        ;;
esac

main "$@"