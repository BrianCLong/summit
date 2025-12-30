#!/bin/bash
set -euo pipefail

# Usage: ./generate-sbom.sh [TARGET] [OUTPUT]
# Example: ./generate-sbom.sh . artifacts/sbom/sbom.json

TARGET=${1:-.}
ARTIFACTS_DIR=${ARTIFACTS_DIR:-artifacts/sbom}
OUTPUT=${2:-"${ARTIFACTS_DIR}/sbom.json"}

if ! command -v syft &> /dev/null; then
    echo "Error: syft is not installed. Please install it from https://github.com/anchore/syft"
    exit 1
fi

mkdir -p "$(dirname "$OUTPUT")"

echo "Generating SBOM for ${TARGET} using Syft..."
syft "$TARGET" -o cyclonedx-json="$OUTPUT" --quiet
echo "SBOM generated at ${OUTPUT}"
