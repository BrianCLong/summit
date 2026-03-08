#!/bin/bash
set -euo pipefail
IMG="${1:-ghcr.io/intelgraph/platform:v1.0.0}"
cosign verify --use-signed-timestamps "$IMG" || { echo "::error::Supply chain verification failed! Missing or invalid signed timestamps."; false; }
cosign verify-attestation --use-signed-timestamps --type cyclonedx "$IMG" || { echo "::error::Supply chain verification failed! Missing or invalid signed timestamps."; false; }
echo "Provenance & SBOM verified."
