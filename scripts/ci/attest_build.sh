#!/usr/bin/env bash
set -euo pipefail

# Inputs
IMAGE_REF="${1:?usage: $0 <image-ref>}"            # e.g., ghcr.io/acme/app:${GITHUB_SHA}
EXPECTED_BUILDER_ID="${EXPECTED_BUILDER_ID:-https://github.com/${GITHUB_REPOSITORY}/.github/workflows/build.yml@refs/heads/main}"

# Build (example — replace with your actual build)
docker build -t "${IMAGE_REF}" .

# Push to registry
docker push "${IMAGE_REF}"

# Resolve immutable digest (subject of attestation)
IMAGE_DIGEST="$(cosign triangulate "${IMAGE_REF}")"   # yields ghcr.io/...@sha256:...
echo "Resolved subject: ${IMAGE_DIGEST}"

# Generate SLSA provenance (SLSA v1 predicate) and sign keylessly with OIDC
# Cosign records cert in Rekor; no long-lived keys needed.
cosign attest \
  --predicate <(jq -n \
     --arg builder "${EXPECTED_BUILDER_ID}" \
     --arg buildType "https://slsa.dev/provenance/v1" \
     '{
        _type: "https://in-toto.io/Statement/v1",
        subject: [{ name: "image", digest: {} }],        # digest filled by cosign
        predicateType: "https://slsa.dev/provenance/v1",
        predicate: {
          builder: { id: $builder },
          buildType: $buildType,
          buildConfig: {},
          metadata: { buildStartedOn: now|todate, completeness: { parameters: true, environment: true } }
        }
      }'
  ) \
  --replace \
  "${IMAGE_DIGEST}"

echo "Attestation pushed for ${IMAGE_DIGEST}"
