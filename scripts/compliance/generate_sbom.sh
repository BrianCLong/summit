#!/bin/bash
set -e

# SBOM Generation Script
# Requires cdxgen to be installed (npm install -g @cyclonedx/cdxgen)

OUTPUT_DIR="artifacts/sbom"
mkdir -p $OUTPUT_DIR

# Get Commit SHA
COMMIT_SHA=$(git rev-parse HEAD 2>/dev/null || echo "unknown-sha")
echo "Generating SBOM for Server (Commit: $COMMIT_SHA)..."

SBOM_FILENAME="server-sbom-${COMMIT_SHA}.json"
SBOM_PATH="$OUTPUT_DIR/$SBOM_FILENAME"

if ! command -v cdxgen &> /dev/null; then
    if [ "$CI" = "true" ]; then
        echo "Error: cdxgen is not installed and CI=true."
        echo "CRITICAL: SBOM generation failed due to missing tool in CI."
        exit 1
    else
        echo "Warning: cdxgen is not installed."
        echo "Creating MOCK SBOM for development/sandbox environment."

        cat <<EOF > "$SBOM_PATH"
{
  "bomFormat": "CycloneDX",
  "specVersion": "1.4",
  "version": 1,
  "metadata": {
    "component": {
      "name": "server",
      "version": "1.0.0"
    }
  },
  "components": []
}
EOF
    fi
else
    cdxgen -t nodejs -o "$SBOM_PATH" server/
fi

echo "SBOM generated at $SBOM_PATH"

# Output for CI
if [ -n "$GITHUB_OUTPUT" ]; then
    echo "sbom_path=$SBOM_PATH" >> "$GITHUB_OUTPUT"
fi

echo "SBOM generation complete."
