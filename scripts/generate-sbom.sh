#!/bin/bash
set -e

# Usage: ./generate-sbom.sh [TARGET] [OUTPUT]
# Example: ./generate-sbom.sh . sbom.json

TARGET=${1:-.}
OUTPUT=${2:-sbom.json}

if ! command -v syft &> /dev/null; then
    echo "Error: syft is not installed. Please install it from https://github.com/anchore/syft"
    exit 1
fi

echo "Generating SBOM for $TARGET using Syft..."
syft "$TARGET" -o cyclonedx-json="$OUTPUT" --quiet
echo "SBOM generated at $OUTPUT"
