#!/bin/bash
set -e

# Summit Audit Evidence Collector
# Usage: ./scripts/compliance/collect_evidence.sh

# Use /tmp for intermediate storage to avoid "too many files" error in sandbox
TEMP_DIR=$(mktemp -d)
EVIDENCE_DIR="$TEMP_DIR/evidence"
FINAL_DEST="docs/audit"
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

echo "Starting Evidence Collection at $TIMESTAMP..."
echo "Working in $TEMP_DIR..."

# 1. Prepare Directories
mkdir -p "$EVIDENCE_DIR/access"
mkdir -p "$EVIDENCE_DIR/change"
mkdir -p "$EVIDENCE_DIR/data"
mkdir -p "$EVIDENCE_DIR/incidents"
mkdir -p "$FINAL_DEST"

# 2. Collect Access Control Evidence
echo "Collecting Access Control Evidence..."
# Copy all rego files found in policy/
cp policy/*.rego "$EVIDENCE_DIR/access/" 2>/dev/null || echo "No rego policies found in policy/"
# Dump a schema or code snippet showing Auth logic
grep -r "class AuthService" server/src/services/AuthService.ts > "$EVIDENCE_DIR/access/auth_service_signature.txt" 2>/dev/null || true

# 3. Collect Change Management Evidence
echo "Collecting Change Management Evidence..."
# Snapshot CI configurations - limit to key security ones to save space/time
cp .github/workflows/security.yml "$EVIDENCE_DIR/change/" 2>/dev/null || true
cp .github/workflows/release.yml "$EVIDENCE_DIR/change/" 2>/dev/null || true
# Capture current git status and last commit (Provenance)
git log -1 --format="Commit: %H%nAuthor: %an%nDate: %cd%nMessage: %s" > "$EVIDENCE_DIR/change/current_commit_provenance.txt"
git status > "$EVIDENCE_DIR/change/git_status_snapshot.txt"

# 4. Collect Data Protection Evidence
echo "Collecting Data Protection Evidence..."
# Snapshot schema definitions (PII markers) - Try to find schema files
find server/src/graphql -name "*.graphql" -exec cat {} + | grep "@pii" > "$EVIDENCE_DIR/data/pii_fields_snapshot.txt" || echo "No PII markers found"
# Capture Encryption Logic
grep -r "cipher" server/src/utils/crypto.ts 2>/dev/null > "$EVIDENCE_DIR/data/encryption_logic_snapshot.txt" || true

# 5. Collect Incident Response / Reliability Evidence
echo "Collecting Reliability Evidence..."
# Snapshot SLO definitions
cp server/src/observability/metrics.ts "$EVIDENCE_DIR/incidents/metrics_def.ts" 2>/dev/null || true

# 6. Generate Provenance Manifest
echo "Generating Provenance Manifest..."
MANIFEST_FILE="$EVIDENCE_DIR/manifest.json"
echo "{" > "$MANIFEST_FILE"
echo "  \"timestamp\": \"$TIMESTAMP\"," >> "$MANIFEST_FILE"
echo "  \"collected_by\": \"Jules (Automated Script)\"," >> "$MANIFEST_FILE"
echo "  \"artifacts\": [" >> "$MANIFEST_FILE"

FIRST=true
find "$EVIDENCE_DIR" -type f -not -name "manifest.json" | while read -r file; do
    if [ "$FIRST" = true ]; then
        FIRST=false
    else
        echo "," >> "$MANIFEST_FILE"
    fi
    # Calculate SHA256
    if command -v sha256sum &> /dev/null; then
        HASH=$(sha256sum "$file" | awk '{print $1}')
    else
        HASH=$(shasum -a 256 "$file" | awk '{print $1}')
    fi
    REL_PATH=${file#$EVIDENCE_DIR/}
    echo "    {" >> "$MANIFEST_FILE"
    echo "      \"path\": \"$REL_PATH\"," >> "$MANIFEST_FILE"
    echo "      \"sha256\": \"$HASH\"" >> "$MANIFEST_FILE"
    echo "    }" >> "$MANIFEST_FILE"
done

echo "  ]" >> "$MANIFEST_FILE"
echo "}" >> "$MANIFEST_FILE"

# 7. Package into Tarball
echo "Packaging evidence..."
tar -czf "$FINAL_DEST/evidence_bundle.tar.gz" -C "$TEMP_DIR" evidence

# Copy manifest to docs as well for visibility
cp "$MANIFEST_FILE" "$FINAL_DEST/evidence_manifest.json"

echo "Evidence Collection Complete."
echo "Bundle: $FINAL_DEST/evidence_bundle.tar.gz"
echo "Manifest: $FINAL_DEST/evidence_manifest.json"

# Cleanup
rm -rf "$TEMP_DIR"
