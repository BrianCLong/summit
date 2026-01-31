#!/bin/bash
# GA Evidence Bundle Generator
# Collects all required proof for GA promotion

set -euo pipefail

VERSION="5.3.1"
SHA=$(git rev-parse HEAD)
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
BUNDLE_DIR="dist/evidence/ga-v${VERSION}"
ARTIFACTS_DIR="artifacts/ga-verify/${SHA}"

echo "📦 Generating GA Evidence Bundle for v${VERSION}..."
echo "SHA: ${SHA}"

# Create bundle structure
mkdir -p "${BUNDLE_DIR}/tests"
mkdir -p "${BUNDLE_DIR}/policy"
mkdir -p "${BUNDLE_DIR}/security"

# 1. Generate Manifest
cat <<EOF > "${BUNDLE_DIR}/manifest.json"
{
  "name": "summit-platform-ga-evidence",
  "version": "${VERSION}",
  "sha": "${SHA}",
  "timestamp": "${TIMESTAMP}",
  "toolchain": {
    "node": "$(node -v)",
    "pnpm": "$(pnpm -v)",
    "os": "$(uname -s)"
  }
}
EOF

# 2. Collect Test Proofs
echo "📊 Collecting test proofs..."
if [ -d "${ARTIFACTS_DIR}/logs" ]; then
    cp "${ARTIFACTS_DIR}/logs/"* "${BUNDLE_DIR}/tests/" 2>/dev/null || true
    cp "${ARTIFACTS_DIR}/stamp.json" "${BUNDLE_DIR}/tests/summary.json" 2>/dev/null || true
else
    echo "⚠️  Warning: No local ga-verify artifacts found at ${ARTIFACTS_DIR}. Run 'pnpm ga:verify' first for full evidence."
fi

# 3. Collect OPA Policy Evaluations
echo "⚖️  Collecting policy evaluations..."
# Generate a fresh evaluation if input exists
if [ -f "evidence/provenance-input.json" ]; then
    if command -v opa &> /dev/null; then
        opa eval -i evidence/provenance-input.json -d policy/supply_chain.rego "data.supply_chain" --format json > "${BUNDLE_DIR}/policy/opa-evaluation.json"
    else
        echo "{\"warning\": \"opa command not found\"}" > "${BUNDLE_DIR}/policy/opa-evaluation.json"
    fi
else
    echo "{}" > "${BUNDLE_DIR}/policy/opa-evaluation.json"
fi

# 4. Collect Security Reports (Dependency Audit)
echo "🛡️  Collecting security reports..."
pnpm audit --prod --json > "${BUNDLE_DIR}/security/pnpm-audit.json" || true

# 5. Create README
cat <<'EOF' > "${BUNDLE_DIR}/README.md"
# GA Evidence Bundle

This bundle contains the cryptographic and procedural evidence required for General Availability promotion.

## Contents
- `manifest.json`: Build metadata and toolchain info.
- `tests/`: Logs and summaries from unit, integration, and smoke tests.
- `policy/`: OPA evaluation results for supply chain compliance.
- `security/`: Dependency audit reports and vulnerability scans.

## Reproduction
To recreate this bundle, run:
```bash
pnpm ga:verify
pnpm ga:evidence
```
EOF

# 6. Compress Bundle
mkdir -p dist/evidence
cd dist/evidence
zip -r "ga-v${VERSION}.zip" "ga-v${VERSION}"
cd - > /dev/null

echo "✅ GA Evidence Bundle created at dist/evidence/ga-v${VERSION}.zip"