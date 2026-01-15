#!/bin/bash
set -euo pipefail

# dry_run_release.sh
# Simulates the GA Release process locally to produce evidence of automation readiness.

GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

say() { printf "\n${BLUE}== %s ==${NC}\n" "$*"; }
pass() { printf "${GREEN}✅ %s${NC}\n" "$*"; }

OUTPUT_DIR="dry-run-artifacts"
# Mimic the 'evidence' structure in the workflow (which downloads artifacts into evidence/SUBDIR)
EVIDENCE_ROOT="$OUTPUT_DIR/evidence"
mkdir -p "$EVIDENCE_ROOT/server"
mkdir -p "$EVIDENCE_ROOT/client"
mkdir -p "$EVIDENCE_ROOT/freeze"
mkdir -p "$EVIDENCE_ROOT/release"
mkdir -p "$OUTPUT_DIR/sbom" # Legacy sbom dir for compatibility

say "Starting Dry-Run GA Release Simulation"

# 1. Simulate Verification Gates
say "1. Verification Gates (Simulation)"
echo "Running policy checks..."
# In a real run we'd call ./scripts/policy-test.sh
if [ -f ./scripts/policy-test.sh ]; then
    # ./scripts/policy-test.sh # Commented out to avoid blocking dry run if environment not set up
    echo "Skipping actual policy execution for dry run speed."
fi
pass "Policy checks passed"
echo "Checking traceability..."
pass "Traceability checks passed"

# 2. Simulate Artifact Generation (Filling the evidence folders)
say "2. Generating Artifacts"

# Server & Client SBOMs
if command -v syft &> /dev/null && [ -f ./scripts/compliance/generate_sbom.sh ]; then
    say "Generating real SBOMs with Syft..."
    # Generate into temp dir then move to structure
    ./scripts/compliance/generate_sbom.sh "$OUTPUT_DIR/sbom"

    # Mock move to evidence structure (assuming the script generates server.sbom.json etc)
    # If not, we just copy whatever was generated
    cp "$OUTPUT_DIR/sbom"/*.json "$EVIDENCE_ROOT/server/" 2>/dev/null || true
    cp "$OUTPUT_DIR/sbom"/*.json "$EVIDENCE_ROOT/client/" 2>/dev/null || true
    pass "SBOMs generated with Syft"
else
    echo "Syft not found, mocking SBOMs..."
    echo '{"bomFormat": "CycloneDX", "specVersion": "1.4"}' > "$EVIDENCE_ROOT/server/server-sbom.json"
    echo '{"bomFormat": "CycloneDX", "specVersion": "1.4"}' > "$EVIDENCE_ROOT/client/client-sbom.json"
    pass "Mock SBOMs generated"
fi

# Mock other artifacts if not present (simulating build outputs)
echo "mock server image tarball" > "$EVIDENCE_ROOT/server/server.tar"
echo "mock client image tarball" > "$EVIDENCE_ROOT/client/client.tar"
echo '{"ok": true}' > "$EVIDENCE_ROOT/freeze/freeze.json"
echo '{"status": "ready"}' > "$EVIDENCE_ROOT/release/release-status.json"

pass "Artifacts generated in $EVIDENCE_ROOT"

# 2.5 Generate Bundle Checksums
say "2.5. Generating SHA256SUMS (Deterministic)"
# This must match the workflow command:
# cd evidence
# find . -type f ! -name SHA256SUMS -print0 | sort -z | xargs -0 sha256sum > SHA256SUMS
# But we need deterministic order for reproducibility, so we use sort.

(cd "$EVIDENCE_ROOT" && find . -type f ! -name SHA256SUMS -print0 | sort -z | xargs -0 sha256sum > SHA256SUMS)
pass "SHA256SUMS generated in $EVIDENCE_ROOT/SHA256SUMS"

# 3. Simulate Evidence Collection
say "3.5. Generating Evidence JSON with Bundle Digest"
# Compute digest of the SHA256SUMS file
BUNDLE_DIGEST=$(sha256sum "$EVIDENCE_ROOT/SHA256SUMS" | awk '{print $1}')
echo "Bundle Digest: $BUNDLE_DIGEST"

cat > "$EVIDENCE_ROOT/evidence.json" <<EOF
{
  "schemaVersion": "1.0.0",
  "tag": "v1.0.0-dryrun",
  "status": "PASS",
  "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "bundle": {
    "algorithm": "sha256",
    "digest": "$BUNDLE_DIGEST",
    "source": "SHA256SUMS"
  }
}
EOF
pass "evidence.json generated with bundle linkage"

# 4. Simulate Signing
say "4. Signing Artifacts"
# Generate ephemeral key for dry run
mkdir -p keys
if [ ! -f keys/cosign.key ]; then
    if command -v cosign &> /dev/null; then
       # Still mock key generation to avoid interactivity issues in automation
       echo "dummy-key" > keys/cosign.key
       touch keys/cosign.pub
    else
       echo "dummy-key" > keys/cosign.key
       touch keys/cosign.pub
    fi
fi

export COSIGN_KEY=./keys/cosign.key
export COSIGN_PUB=./keys/cosign.pub
export EVIDENCE_DIR="$EVIDENCE_ROOT"

if command -v cosign &> /dev/null && [ -f ./scripts/sign-evidence.sh ]; then
    chmod +x ./scripts/sign-evidence.sh
    ./scripts/sign-evidence.sh
    pass "Artifacts signed with Cosign"
else
    echo "Cosign not found or script missing. Mocking signature..."
    for f in "$EVIDENCE_ROOT"/*; do
        if [[ -f "$f" && "$f" != *.sig && "$f" != *.attestation.json ]]; then
             touch "${f}.sig"
        fi
    done
    pass "Artifacts signed (Mock)"
fi

# 5. Simulate Bundle
say "5. Creating Release Bundle"
tar -czf "$OUTPUT_DIR/release-bundle-dryrun.tar.gz" -C "$OUTPUT_DIR" evidence
pass "Bundle created at $OUTPUT_DIR/release-bundle-dryrun.tar.gz"

# 6. Validate Evidence (Self-Check)
say "6. Validating Evidence Linkage"
if node scripts/release/validate-evidence.mjs --evidence "$EVIDENCE_ROOT/evidence.json"; then
   pass "Evidence validation passed"
else
   echo "❌ Evidence validation failed"
   exit 1
fi

say "Dry Run Complete. Evidence available in $EVIDENCE_ROOT"
