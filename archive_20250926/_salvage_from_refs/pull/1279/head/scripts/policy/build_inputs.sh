#!/usr/bin/env bash
set -euo pipefail

# Builds OPA input JSONs for CI gates using env vars (or sane defaults).
# Outputs to server/policies/ci/inputs/

OUTDIR="server/policies/ci/inputs"
mkdir -p "$OUTDIR"

# SLO burn-rate inputs
NLQ_BURN_RATE_6H=${PROM_BURN_RATE_NLQ_6H:-0.01}
CYPHER_BURN_RATE_6H=${PROM_BURN_RATE_CYPHER_6H:-0.01}
cat > "$OUTDIR/slo.json" <<EOF
{ "metrics": { "nlq_burn_rate_6h": ${NLQ_BURN_RATE_6H}, "cypher_burn_rate_6h": ${CYPHER_BURN_RATE_6H} } }
EOF

# SBOM diff inputs
NEW_VULNS_HIGH=${NEW_VULNS_HIGH:-0}
NEW_VULNS_CRITICAL=${NEW_VULNS_CRITICAL:-0}
cat > "$OUTDIR/sbom.json" <<EOF
{ "new_vulns": { "high": ${NEW_VULNS_HIGH}, "critical": ${NEW_VULNS_CRITICAL} } }
EOF

# WebAuthn coverage inputs
SENSITIVE_ENDPOINTS=${SENSITIVE_ENDPOINTS:-120}
PROTECTED_ENDPOINTS=${PROTECTED_ENDPOINTS:-120}
cat > "$OUTDIR/webauthn.json" <<EOF
{ "sensitive_endpoints": ${SENSITIVE_ENDPOINTS}, "protected_endpoints": ${PROTECTED_ENDPOINTS} }
EOF

echo "Wrote inputs to $OUTDIR:"
ls -1 "$OUTDIR" | sed 's/^/ - /'

