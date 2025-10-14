#!/usr/bin/env bash
# Generate SHA256 hashes for policy bundle and pin to release

set -euo pipefail

RELEASE_TAG="${RELEASE_TAG:-2025.10.HALLOWEEN}"
POLICY_DIR="${POLICY_DIR:-./policies}"
OUTPUT_DIR="${OUTPUT_DIR:-./governance}"

# Color output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $*"; }

# Create output directory
mkdir -p "$OUTPUT_DIR"

# Generate timestamp
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

log_info "Generating policy bundle SHAs for release: $RELEASE_TAG"

# Create policy manifest
MANIFEST_FILE="$OUTPUT_DIR/policy-bundle-manifest-${RELEASE_TAG}.json"

cat > "$MANIFEST_FILE" <<EOF
{
  "release": "$RELEASE_TAG",
  "timestamp": "$TIMESTAMP",
  "policy_bundle_version": "1.0.0",
  "policies": [
EOF

# Generate SHA256 for each policy file
FIRST=true
for policy_file in "$POLICY_DIR"/*.rego; do
  if [ ! -f "$policy_file" ]; then
    continue
  fi

  filename=$(basename "$policy_file")
  sha256=$(sha256sum "$policy_file" | awk '{print $1}')

  if [ "$FIRST" = true ]; then
    FIRST=false
  else
    echo "," >> "$MANIFEST_FILE"
  fi

  cat >> "$MANIFEST_FILE" <<EOF
    {
      "file": "$filename",
      "path": "$policy_file",
      "sha256": "$sha256"
    }
EOF

  log_info "  $filename: $sha256"
done

# Close JSON
cat >> "$MANIFEST_FILE" <<EOF

  ],
  "bundle_sha256": "$(cat "$POLICY_DIR"/*.rego | sha256sum | awk '{print $1}')"
}
EOF

log_info "Policy manifest saved to: $MANIFEST_FILE"

# Generate simple SHA list
SHA_LIST_FILE="$OUTPUT_DIR/policy-bundle-shas-${RELEASE_TAG}.txt"
cat > "$SHA_LIST_FILE" <<EOF
# Policy Bundle SHA256 Hashes - Release $RELEASE_TAG
# Generated: $TIMESTAMP

EOF

sha256sum "$POLICY_DIR"/*.rego >> "$SHA_LIST_FILE"

echo "" >> "$SHA_LIST_FILE"
echo "# Bundle SHA256: $(cat "$POLICY_DIR"/*.rego | sha256sum | awk '{print $1}')" >> "$SHA_LIST_FILE"

log_info "SHA list saved to: $SHA_LIST_FILE"

# Generate git tag with policy SHAs
POLICY_TAG="policy-bundle-${RELEASE_TAG}"

if git tag -l "$POLICY_TAG" | grep -q "$POLICY_TAG"; then
  log_info "Policy tag already exists: $POLICY_TAG"
else
  git tag -a "$POLICY_TAG" -m "Policy Bundle for Release $RELEASE_TAG

Policy Files ($(ls -1 "$POLICY_DIR"/*.rego | wc -l | xargs)):
$(sha256sum "$POLICY_DIR"/*.rego | awk '{print "- " $2 ": " $1}')

Bundle SHA256: $(cat "$POLICY_DIR"/*.rego | sha256sum | awk '{print $1}')

Manifest: $MANIFEST_FILE
"

  log_info "Created policy tag: $POLICY_TAG"
fi

log_info "✅ Policy bundle SHAs generated and pinned to release"
log_info ""
log_info "Files generated:"
log_info "  1. $MANIFEST_FILE (JSON manifest)"
log_info "  2. $SHA_LIST_FILE (SHA256 list)"
log_info "  3. Git tag: $POLICY_TAG"
log_info ""
log_info "To verify policy integrity:"
log_info "  cd $POLICY_DIR && sha256sum -c ../governance/policy-bundle-shas-${RELEASE_TAG}.txt"
