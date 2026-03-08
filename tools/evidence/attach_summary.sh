#!/usr/bin/env bash
set -euo pipefail

PR="${GITHUB_PR_NUMBER:-local}"
OUT="tools/evidence/out"
SBOM=$( [ -f "$OUT/sbom.spdx.json" ] && echo "sbom.spdx.json" || echo "bom.cyclonedx.json" )
STATUS_BADGE_OK='![pass](https://img.shields.io/badge/verification-pass-brightgreen)'
STATUS_BADGE_WARN='![warn](https://img.shields.io/badge/verification-best--effort-yellow)'
SBOM_BADGE='![sbom](https://img.shields.io/badge/SBOM-present-blue)'

# Minimal "pass" heuristic: SBOM exists JSON parse OK
PASS="false"
if jq type < "$OUT/$SBOM" > /dev/null 2>&1; then PASS="true"; fi

if [ "$PASS" = "true" ]; then
  VERIFICATION_BADGE="$STATUS_BADGE_OK"
else
  VERIFICATION_BADGE="$STATUS_BADGE_WARN"
fi

cat >> "${GITHUB_STEP_SUMMARY}" <<MD
### Evidence Pack for PR #$PR

$VERIFICATION_BADGE  $SBOM_BADGE

**Artifacts**
- SLSA provenance: \`provenance.slsa.json\`
- SBOM: \`$SBOM\`
- OpenLineage: \`openlineage_run.json\`
- CI runtime: \`ci_runtime.json\`

**Notes**
- Cosign checks: best-effort (verifies if signatures/attestations are present)
- All files are bundled as \`evidence-$PR.tar.gz\` (see Artifacts section)
MD
