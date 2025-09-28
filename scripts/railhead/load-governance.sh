#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/_common.sh"

usage() {
  cat <<USAGE
Usage: $0 [--risk-ledger] [--raci] [--dod]

Publishes governance scaffolding for the current Railhead run.
USAGE
}

RUN_RISK=false
RUN_RACI=false
RUN_DOD=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --risk-ledger)
      RUN_RISK=true
      shift
      ;;
    --raci)
      RUN_RACI=true
      shift
      ;;
    --dod)
      RUN_DOD=true
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage
      exit 1
      ;;
  esac
done

if ! $RUN_RISK && ! $RUN_RACI && ! $RUN_DOD; then
  RUN_RISK=true
  RUN_RACI=true
  RUN_DOD=true
fi

RUN_DIR="$(railhead::require_run_dir)"
LOG_DIR="$(railhead::log_dir_for_run "${RUN_DIR}")"
LOG_FILE="${LOG_DIR}/governance.log"
GOV_DIR="${RUN_DIR}/governance"
mkdir -p "${GOV_DIR}"

railhead::log "${LOG_FILE}" "Loading governance artifacts"

if $RUN_RISK; then
  RAILHEAD_ROOT="${RAILHEAD_ROOT_DIR}" RUN_PATH="${RUN_DIR}" GOVERNANCE_DIR="${GOV_DIR}" python3 - <<'PY'
import csv
import json
import os
from pathlib import Path

root = Path(os.environ["RAILHEAD_ROOT"])
run_dir = Path(os.environ["RUN_PATH"])
manifest_path = run_dir / 'manifest.json'
vuln_path = run_dir / 'security' / 'vulnerability-findings.csv'

rows = []
if vuln_path.exists():
    with vuln_path.open() as fh:
        reader = csv.DictReader(fh)
        for row in reader:
            rows.append({
                'id': f"VULN-{row['component'].upper()}",
                'area': 'security',
                'description': f"Review dependency {row['component']} version {row['installed']}",
                'severity': row['severity'],
                'owner': 'security-eng',
                'status': 'open',
            })

risk_path = Path(os.environ["GOVERNANCE_DIR"]) / 'risk-ledger.csv'
with risk_path.open('w', newline='', encoding='utf-8') as fh:
    writer = csv.DictWriter(fh, fieldnames=['id', 'area', 'description', 'severity', 'owner', 'status'])
    writer.writeheader()
    for row in rows:
        writer.writerow(row)

summary = {
    'source': str(manifest_path.relative_to(root)),
    'total_open': len(rows),
}
(risk_path.parent / 'risk-ledger.json').write_text(json.dumps(summary, indent=2) + '\n', encoding='utf-8')
PY
  railhead::add_to_manifest "${RUN_DIR}" "governance" "${GOV_DIR}/risk-ledger.csv" "Risk ledger derived from findings"
  railhead::add_to_manifest "${RUN_DIR}" "governance" "${GOV_DIR}/risk-ledger.json" "Risk ledger summary"
  railhead::log "${LOG_FILE}" "Created risk ledger"
fi

if $RUN_RACI; then
  cat <<'YAML' > "${GOV_DIR}/raci.yaml"
owners:
  release-manager:
    responsible:
      - enforce-gates
    accountable:
      - go-live-readiness
  security-engineering:
    consulted:
      - sbom-review
    responsible:
      - vulnerability-triage
  platform-observability:
    informed:
      - dashboard-refresh
YAML
  railhead::add_to_manifest "${RUN_DIR}" "governance" "${GOV_DIR}/raci.yaml" "RACI ownership map"
  railhead::log "${LOG_FILE}" "Documented RACI matrix"
fi

if $RUN_DOD; then
  cat <<'MARKDOWN' > "${GOV_DIR}/dod-checklist.md"
# Definition of Done Checklist

- [ ] SBOM reviewed and exceptions approved
- [ ] Vulnerability backlog triaged within SLA
- [ ] Observability dashboards refreshed with latest scrape
- [ ] Risk ledger acknowledged by accountable owners
- [ ] Release retro scheduled with enablement team
MARKDOWN
  railhead::add_to_manifest "${RUN_DIR}" "governance" "${GOV_DIR}/dod-checklist.md" "Definition of Done checklist"
  railhead::log "${LOG_FILE}" "Exported Definition of Done checklist"
fi

railhead::log "${LOG_FILE}" "Governance artifacts ready"
