#!/bin/bash
set -euo pipefail

# scripts/compliance/ga-compliance-validate.sh
# GA compliance validation wrapper (governance checks + audit report).

OUTPUT_DIR="${OUTPUT_DIR:-artifacts/compliance}"
mkdir -p "$OUTPUT_DIR"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { printf "${BLUE}[COMPLIANCE]${NC} %s\n" "$*"; }
warn() { printf "${YELLOW}[WARN]${NC} %s\n" "$*"; }
err() { printf "${RED}[ERR]${NC} %s\n" "$*"; }

governance_status="skipped"
audit_status="skipped"

if [[ -x "scripts/release/check_governance_compliance.sh" ]]; then
  log "Running governance compliance checks..."
  if scripts/release/check_governance_compliance.sh --strict --json > "${OUTPUT_DIR}/governance-compliance.json"; then
    governance_status="pass"
  else
    governance_status="fail"
  fi
else
  warn "Missing scripts/release/check_governance_compliance.sh"
fi

if [[ -x "scripts/audit-verify.sh" ]]; then
  log "Generating audit compliance report..."
  OUTPUT_DIR="${OUTPUT_DIR}/audit" scripts/audit-verify.sh >/dev/null 2>&1 && audit_status="pass" || audit_status="fail"
else
  warn "Missing scripts/audit-verify.sh"
fi

cat > "${OUTPUT_DIR}/ga-compliance-summary.json" <<EOF
{
  "governance": "${governance_status}",
  "audit_report": "${audit_status}"
}
EOF

if [[ "$governance_status" == "fail" || "$audit_status" == "fail" ]]; then
  err "GA compliance validation failed (see ${OUTPUT_DIR})"
  exit 1
fi

log "GA compliance validation complete (see ${OUTPUT_DIR})"
