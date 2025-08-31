#!/usr/bin/env bash
set -euo pipefail

# OPA Bundle Signing Script
# Signs conductor policy bundle with cosign for verification

POLICY_DIR=${POLICY_DIR:-./server/src/conductor/security}
BUNDLE_DIR=${BUNDLE_DIR:-./policy/bundles}
COSIGN_KEY=${COSIGN_KEY:-./keys/cosign.key}
COSIGN_PUB=${COSIGN_PUB:-./keys/cosign.pub}

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

say() { printf "\n${BLUE}== %s ==${NC}\n" "$*"; }
pass() { printf "${GREEN}✅ %s${NC}\n" "$*"; }

# Generate keys if they don't exist
generate_keys() {
    if [ ! -f "$COSIGN_KEY" ]; then
        say "Generating cosign key pair"
        mkdir -p "$(dirname "$COSIGN_KEY")"
        cosign generate-key-pair --output-key-prefix "$(dirname "$COSIGN_KEY")/cosign"
        pass "Key pair generated"
    fi
}

# Create policy bundle
create_bundle() {
    say "Creating OPA policy bundle"
    
    mkdir -p "$BUNDLE_DIR"
    
    # Create bundle structure
    local bundle_tmp=$(mktemp -d)
    cp -r "$POLICY_DIR"/*.rego "$bundle_tmp/"
    
    # Create bundle metadata
    cat > "$bundle_tmp/.manifest" << EOF
{
  "revision": "$(git rev-parse HEAD 2>/dev/null || echo 'unknown')",
  "roots": ["conductor"],
  "metadata": {
    "version": "$(date -u +%Y%m%d-%H%M%S)",
    "build": "${BUILD_SHA:-unknown}",
    "created": "$(date -u -Iseconds)"
  }
}
EOF
    
    # Create tarball
    local bundle_file="$BUNDLE_DIR/conductor.tar.gz"
    tar -czf "$bundle_file" -C "$bundle_tmp" .
    rm -rf "$bundle_tmp"
    
    pass "Bundle created: $bundle_file"
    echo "$bundle_file"
}

# Sign bundle with cosign
sign_bundle() {
    local bundle_file="$1"
    
    say "Signing policy bundle with cosign"
    
    # Sign the bundle
    cosign sign-blob --key "$COSIGN_KEY" "$bundle_file" --output-signature "${bundle_file}.sig"
    
    # Create verification metadata
    local bundle_hash=$(sha256sum "$bundle_file" | cut -d' ' -f1)
    
    cat > "${bundle_file}.metadata" << EOF
{
  "file": "$(basename "$bundle_file")",
  "sha256": "$bundle_hash",
  "signature": "$(basename "${bundle_file}.sig")",
  "key_id": "conductor-policy",
  "signed_at": "$(date -u -Iseconds)",
  "signer": "${USER}@$(hostname)"
}
EOF
    
    pass "Bundle signed successfully"
    pass "Signature: ${bundle_file}.sig"
    pass "Metadata: ${bundle_file}.metadata"
}

# Verify bundle signature
verify_bundle() {
    local bundle_file="$1"
    
    say "Verifying bundle signature"
    
    if cosign verify-blob --key "$COSIGN_PUB" --signature "${bundle_file}.sig" "$bundle_file"; then
        pass "Bundle signature verified"
        return 0
    else
        echo "❌ Bundle signature verification failed"
        return 1
    fi
}

# Main function
main() {
    say "🔐 OPA Bundle Signing Process"
    
    # Check prerequisites
    if ! command -v cosign >/dev/null 2>&1; then
        echo "❌ cosign not found. Install from https://github.com/sigstore/cosign"
        exit 1
    fi
    
    if ! command -v tar >/dev/null 2>&1; then
        echo "❌ tar not found"
        exit 1
    fi
    
    # Generate keys if needed
    generate_keys
    
    # Create bundle
    local bundle_file
    bundle_file=$(create_bundle)
    
    # Sign bundle
    sign_bundle "$bundle_file"
    
    # Verify bundle
    verify_bundle "$bundle_file"
    
    say "Bundle signing complete"
    
    cat << EOF

📦 Bundle Information:
━━━━━━━━━━━━━━━━━━━━━━━━
File: $bundle_file
Signature: ${bundle_file}.sig  
Metadata: ${bundle_file}.metadata
Public Key: $COSIGN_PUB

🚀 Deployment:
1. Copy bundle and signature to policy server
2. Mount public key in OPA container at /etc/opa/keys/conductor-policy.pem
3. Update OPA config to enable signature verification

EOF
}

# Handle command line arguments
case "${1:-}" in
    --verify-only)
        bundle_file="${2:-$BUNDLE_DIR/conductor.tar.gz}"
        verify_bundle "$bundle_file"
        ;;
    --help)
        cat << EOF
Usage: $0 [options]

Options:
  --verify-only FILE    Only verify existing bundle signature
  --help                Show this help

Environment:
  POLICY_DIR=./server/src/conductor/security    Policy source directory
  BUNDLE_DIR=./policy/bundles                   Bundle output directory  
  COSIGN_KEY=./keys/cosign.key                  Private key path
  COSIGN_PUB=./keys/cosign.pub                  Public key path

EOF
        ;;
    *)
        main
        ;;
esac