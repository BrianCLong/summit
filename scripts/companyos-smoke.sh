#!/bin/bash
set -euo pipefail

# scripts/companyos-smoke.sh
# Minimal smoke check for CompanyOS dev stack.

BASE_URL="${BASE_URL:-http://localhost:4100}"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_err() { echo -e "${RED}[ERR]${NC} $1"; }

if ! command -v curl >/dev/null 2>&1; then
  log_err "curl is required"
  exit 1
fi

log_info "CompanyOS smoke check: ${BASE_URL}/health"
if ! curl -sSf "${BASE_URL}/health" >/dev/null; then
  log_err "CompanyOS health check failed"
  exit 1
fi

log_info "CompanyOS smoke check passed"
