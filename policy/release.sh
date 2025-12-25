#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "${ROOT_DIR}"

if [ ! -f VERSION ]; then
    echo "0.1.0" > VERSION
fi

VERSION=$(cat VERSION)
echo "Releasing Policy Bundle v${VERSION}..."

# 1. Run Tests
echo "Running tests..."
if ! ./test.sh; then
    echo "Tests failed! Aborting release."
    exit 1
fi

# 2. Prepare Bundle
DIST_DIR="${ROOT_DIR}/dist"
mkdir -p "${DIST_DIR}"
BUNDLE_NAME="policy-bundle-v${VERSION}"
BUNDLE_DIR="${DIST_DIR}/${BUNDLE_NAME}"

rm -rf "${BUNDLE_DIR}"
mkdir -p "${BUNDLE_DIR}"

# Copy policies
echo "Copying files to bundle..."
rsync -av --exclude='bin' --exclude='dist' --exclude='.git' --exclude='test_report.json' --exclude='*.tgz' . "${BUNDLE_DIR}/"

# 3. Create Manifest
echo "Generating manifest..."
if [ ! -f compatibility.json ]; then
    echo "{}" > compatibility.json
fi

cat > "${BUNDLE_DIR}/manifest.json" <<EOF
{
  "name": "companyos-policies",
  "version": "${VERSION}",
  "build_date": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "compatibility": $(cat compatibility.json)
}
EOF

# 4. Package
echo "Packaging bundle..."
cd "${DIST_DIR}"
tar -czf "${BUNDLE_NAME}.tar.gz" "${BUNDLE_NAME}"

# 5. Sign (Simulated)
echo "Signing bundle..."
sha256sum "${BUNDLE_NAME}.tar.gz" > "${BUNDLE_NAME}.tar.gz.sha256"

echo "========================================"
echo "Release artifact created:"
echo "${DIST_DIR}/${BUNDLE_NAME}.tar.gz"
echo "${DIST_DIR}/${BUNDLE_NAME}.tar.gz.sha256"
echo "========================================"
