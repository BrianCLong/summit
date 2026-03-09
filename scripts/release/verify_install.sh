#!/bin/bash
set -euo pipefail
IMG="${1:-ghcr.io/intelgraph/platform:v1.0.0}"
cosign verify --use-signed-timestamps "$IMG"
cosign verify-attestation --use-signed-timestamps --type cyclonedx "$IMG"
echo "Provenance & SBOM verified."
