#!/bin/bash
# Generate Ops Evidence Pack
# This script aggregates non-supply-chain auxiliary artifacts for operational support.
# Usage: ./generate_ops_evidence_pack.sh [RELEASE_TAG] [OUTPUT_DIR]

set -e

RELEASE_TAG=${1:-"dev-$(date +%Y%m%d)"}
OUTPUT_DIR=${2:-"ops-evidence"}
ARCHIVE_NAME="ops-evidence-pack-${RELEASE_TAG}.tar.gz"

# Create temporary directory for gathering evidence
WORK_DIR=$(mktemp -d)
EVIDENCE_ROOT="${WORK_DIR}/ops-evidence-${RELEASE_TAG}"
mkdir -p "${EVIDENCE_ROOT}"

echo "📦 Generating Ops Evidence Pack for ${RELEASE_TAG}..."
echo "   Output: ${OUTPUT_DIR}/${ARCHIVE_NAME}"

# Helper function to copy safely
safe_copy() {
    local src="$1"
    local dest="$2"
    if [ -d "$src" ]; then
        # Check if directory is not empty
        if [ "$(ls -A "$src")" ]; then
            cp -r "$src"/* "$dest/" 2>/dev/null || echo "Warning: Partial copy from $src"
        fi
    elif [ -f "$src" ]; then
        cp "$src" "$dest/"
    fi
}

# 1. Documentation (Runbooks & Ops Docs)
echo "   Gathering documentation..."
mkdir -p "${EVIDENCE_ROOT}/docs/ops"
mkdir -p "${EVIDENCE_ROOT}/docs/runbooks"

safe_copy "docs/ops" "${EVIDENCE_ROOT}/docs/ops"
safe_copy "docs/runbooks" "${EVIDENCE_ROOT}/docs/runbooks"

# 2. Monitoring Configs
echo "   Gathering monitoring config..."
mkdir -p "${EVIDENCE_ROOT}/monitoring"
safe_copy "monitoring/alerts.yaml" "${EVIDENCE_ROOT}/monitoring"
if [ -d "monitoring/dashboards" ]; then
    mkdir -p "${EVIDENCE_ROOT}/monitoring/dashboards"
    safe_copy "monitoring/dashboards" "${EVIDENCE_ROOT}/monitoring/dashboards"
fi

# 3. Operational Scripts
echo "   Gathering operational scripts..."
mkdir -p "${EVIDENCE_ROOT}/scripts/ops"
safe_copy "scripts/ops" "${EVIDENCE_ROOT}/scripts/ops"

# 4. Manifest
echo "   Creating manifest..."
cat > "${EVIDENCE_ROOT}/MANIFEST.json" <<EOF
{
  "release_tag": "${RELEASE_TAG}",
  "generated_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "contents": [
    "docs/ops",
    "docs/runbooks",
    "monitoring",
    "scripts/ops"
  ],
  "description": "Operational Evidence Pack - NOT for Supply Chain verification."
}
EOF

# 5. Archive
echo "   Archiving..."
mkdir -p "${OUTPUT_DIR}"
tar -czf "${OUTPUT_DIR}/${ARCHIVE_NAME}" -C "${WORK_DIR}" "ops-evidence-${RELEASE_TAG}"

# Cleanup
rm -rf "${WORK_DIR}"

echo "✅ Ops Evidence Pack created at: ${OUTPUT_DIR}/${ARCHIVE_NAME}"
