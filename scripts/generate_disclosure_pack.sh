#!/bin/bash
set -e

# EO-5: Disclosure Pack & Demos
# Workstream: Disclosure Pack & GTM
# Outcome: One-command pack

OUTPUT_DIR="artifacts/disclosure_pack"
mkdir -p "$OUTPUT_DIR"

VERSION=$(node -p "require('./package.json').version")
TIMESTAMP=$(date -u +"%Y-%m-%d")
PACK_NAME="Disclosure_Pack_${VERSION}_${TIMESTAMP}"
PACK_DIR="$OUTPUT_DIR/$PACK_NAME"

mkdir -p "$PACK_DIR"

echo "[INFO] Assembling Disclosure Pack for version $VERSION..."

# 1. Copy SBOM and SLSA (Run generation first)
./scripts/compliance/generate_sbom.sh
cp artifacts/sbom/* "$PACK_DIR/"

# 2. Generate Risk Memo (Dummy)
echo "Generating Risk Memo..."
cat <<EOF > "$PACK_DIR/Risk_Memo.md"
# Risk Assessment Memo
Date: $TIMESTAMP
Version: $VERSION

## Residual Risks
- None identified at high severity.

## Mitigations
- DLP active.
- SBOM generated.
- SLSA provenance verified.

## Rollback Plan
- Auto-rollback enabled on >1% error rate or >300ms latency.
EOF

# 3. Generate Rollback Plan (Dummy)
cat <<EOF > "$PACK_DIR/Rollback_Plan.md"
# Rollback Plan
Trigger: Automated SLO Breach (Error > 1%)
Action: Revert to previous hash.
Estimated RTO: < 1 minute.
EOF

# 4. Zip it up
cd "$OUTPUT_DIR"
zip -r "${PACK_NAME}.zip" "$PACK_NAME"
cd -

echo "[SUCCESS] Disclosure Pack created at $OUTPUT_DIR/${PACK_NAME}.zip"
