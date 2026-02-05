#!/bin/bash
set -euo pipefail

# scripts/compliance/ga-sbom-cve.sh
# Generate SBOM and (optionally) run CVE scan.

OUTPUT_DIR="${OUTPUT_DIR:-artifacts/compliance}"
CVE_MAX="${CVE_MAX:-0}"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { printf "${BLUE}[SBOM]${NC} %s\n" "$*"; }
warn() { printf "${YELLOW}[WARN]${NC} %s\n" "$*"; }
err() { printf "${RED}[ERR]${NC} %s\n" "$*"; }

mkdir -p "${OUTPUT_DIR}/sbom"

sbom_status="skipped"
cve_status="skipped"

if [[ -x "scripts/compliance/generate_sbom.sh" ]]; then
  log "Generating SBOM..."
  if scripts/compliance/generate_sbom.sh "${OUTPUT_DIR}/sbom" >/dev/null 2>&1; then
    sbom_status="pass"
  else
    sbom_status="fail"
  fi
else
  warn "Missing scripts/compliance/generate_sbom.sh"
fi

if command -v trivy >/dev/null 2>&1; then
  log "Running CVE scan (threshold: ${CVE_MAX})..."
  if trivy fs --quiet --exit-code 1 --severity CRITICAL,HIGH . >/dev/null 2>&1; then
    cve_status="pass"
  else
    cve_status="fail"
  fi
else
  warn "trivy not available; CVE scan deferred pending tooling"
  cve_status="deferred"
fi

cat > "${OUTPUT_DIR}/sbom-cve-summary.json" <<EOF
{
  "sbom": "${sbom_status}",
  "cve_scan": "${cve_status}",
  "cve_threshold": ${CVE_MAX}
}
EOF

if [[ "$sbom_status" == "fail" || "$cve_status" == "fail" ]]; then
  err "SBOM/CVE gate failed (see ${OUTPUT_DIR})"
  exit 1
fi

log "SBOM/CVE gate complete (see ${OUTPUT_DIR})"
