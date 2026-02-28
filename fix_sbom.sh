#!/bin/bash

# Fix generate-sbom path issue
sed -i 's/\.\/sboms\/SBOM_SUMMARY-${VERSION}\.json/artifacts\/sbom\/SBOM_SUMMARY-${VERSION}.json/g' scripts/generate-sbom.sh || true
sed -i 's/\.\/sboms\/SBOM_SUMMARY/artifacts\/sbom\/SBOM_SUMMARY/g' scripts/generate-sbom.sh || true

# Add missing reason codes to registry
cat << 'REASON_EOF' >> docs/releases/reason-codes.yml
  - SCHEMA_MAJOR_UNSUPPORTED
  - SCHEMA_VERSION_INVALID
  - JSON_PARSE_ERROR
  - MISSING_FIELD
  - INVALID_ENUM
  - DRIFT_DETECTED
  - DRIFT_ERROR
  - SIG_ORPHAN
  - SIG_INVALID
  - COSIGN_MISSING
  - SIG_MISSING
  - ATTESTATION_MISSING
  - SHA256SUMS_INVALID_FORMAT
  - INVALID_JSON
REASON_EOF

# Fix the LongRunJob execution
mkdir -p .bin
ln -s $(which pnpm) .bin/pnpm || true
export PATH=$PATH:$PWD/.bin
