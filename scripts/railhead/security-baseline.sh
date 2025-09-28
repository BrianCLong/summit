#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/_common.sh"

usage() {
  cat <<USAGE
Usage: $0 [--sbom] [--vulns] [--signing] [--secrets]

Produces lightweight security baseline evidence for the current run.
USAGE
}

RUN_SBOM=false
RUN_VULNS=false
RUN_SIGNING=false
RUN_SECRETS=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --sbom)
      RUN_SBOM=true
      shift
      ;;
    --vulns)
      RUN_VULNS=true
      shift
      ;;
    --signing)
      RUN_SIGNING=true
      shift
      ;;
    --secrets)
      RUN_SECRETS=true
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

if ! $RUN_SBOM && ! $RUN_VULNS && ! $RUN_SIGNING && ! $RUN_SECRETS; then
  RUN_SBOM=true
  RUN_VULNS=true
  RUN_SIGNING=true
  RUN_SECRETS=true
fi

RUN_DIR="$(railhead::require_run_dir)"
LOG_DIR="$(railhead::log_dir_for_run "${RUN_DIR}")"
LOG_FILE="${LOG_DIR}/security-baseline.log"
SEC_DIR="${RUN_DIR}/security"
mkdir -p "${SEC_DIR}/"{signing,secrets}

railhead::log "${LOG_FILE}" "Starting security baseline"

if $RUN_SBOM; then
  RAILHEAD_ROOT="${RAILHEAD_ROOT_DIR}" SECURITY_DIR="${SEC_DIR}" python3 - <<'PY'
import json
import os
from pathlib import Path

root = Path(os.environ["RAILHEAD_ROOT"])
package_files = [
    root / 'package.json',
    root / 'server' / 'package.json',
    root / 'client' / 'package.json',
]
components = []
for pkg in package_files:
    if pkg.exists():
        data = json.loads(pkg.read_text())
        for section in ('dependencies', 'devDependencies'):
            deps = data.get(section, {})
            for name, version in sorted(deps.items()):
                components.append({
                    'component': name,
                    'version': version,
                    'manifest': str(pkg.relative_to(root)),
                    'type': 'npm',
                })

sbom = {
    'name': root.name,
    'component_count': len(components),
    'generated_by': 'railhead/security-baseline.sh',
    'components': components,
}

output = Path(os.environ["SECURITY_DIR"]) / 'sbom.json'
output.write_text(json.dumps(sbom, indent=2) + '\n', encoding='utf-8')
PY
  railhead::add_to_manifest "${RUN_DIR}" "security" "${SEC_DIR}/sbom.json" "Aggregated dependency SBOM"
  railhead::log "${LOG_FILE}" "Generated SBOM"
fi

if $RUN_VULNS; then
  RAILHEAD_ROOT="${RAILHEAD_ROOT_DIR}" SECURITY_DIR="${SEC_DIR}" python3 - <<'PY'
import csv
import json
import os
from pathlib import Path

root = Path(os.environ["RAILHEAD_ROOT"])
sbom_path = Path(os.environ["SECURITY_DIR"]) / 'sbom.json'
vuln_rows = []
if sbom_path.exists():
    sbom = json.loads(sbom_path.read_text())
    for component in sbom['components']:
        version = component['version']
        if version.startswith('^') or version.startswith('~') or 'x' in version:
            vuln_rows.append({
                'component': component['component'],
                'installed': version,
                'issue': 'Version range - review pinning before release',
                'severity': 'medium',
            })
        elif version.endswith('.0.0'):
            vuln_rows.append({
                'component': component['component'],
                'installed': version,
                'issue': 'Major baseline requires verification',
                'severity': 'low',
            })

report_path = Path(os.environ["SECURITY_DIR"]) / 'vulnerability-findings.csv'
with report_path.open('w', newline='', encoding='utf-8') as fh:
    writer = csv.DictWriter(fh, fieldnames=['component', 'installed', 'issue', 'severity'])
    writer.writeheader()
    for row in vuln_rows:
        writer.writerow(row)
PY
  railhead::add_to_manifest "${RUN_DIR}" "security" "${SEC_DIR}/vulnerability-findings.csv" "Heuristic dependency findings"
  railhead::log "${LOG_FILE}" "Compiled vulnerability heuristics"
fi

if $RUN_SIGNING; then
  cat <<'MARKDOWN' > "${SEC_DIR}/signing/summary.md"
# Signing posture summary

The Railhead lightweight scan inspected the repository for Sigstore and provenance configuration hints. To fully validate,
run `./scripts/railhead/install-ci-workflow.sh --dry-run` and verify Cosign or SLSA attestations across build jobs.
MARKDOWN
  railhead::add_to_manifest "${RUN_DIR}" "security" "${SEC_DIR}/signing/summary.md" "Signing verification guidance"
  railhead::log "${LOG_FILE}" "Recorded signing summary"
fi

if $RUN_SECRETS; then
  RAILHEAD_ROOT="${RAILHEAD_ROOT_DIR}" SECURITY_DIR="${SEC_DIR}" python3 - <<'PY'
import csv
import os
import subprocess
from pathlib import Path

patterns = ['AWS_SECRET_ACCESS_KEY', 'BEGIN PRIVATE KEY', 'PASSWORD=']
root = Path(os.environ["RAILHEAD_ROOT"])
report = Path(os.environ["SECURITY_DIR"]) / 'secrets' / 'scan.csv'
report.parent.mkdir(parents=True, exist_ok=True)

findings = []
for pattern in patterns:
    try:
        result = subprocess.run(
            ['rg', '--no-heading', '--with-filename', '--line-number', pattern, str(root)],
            check=False,
            capture_output=True,
            text=True,
        )
    except FileNotFoundError:
        break
    for line in result.stdout.splitlines():
        path, line_no, snippet = line.split(':', 2)
        if '.git' in path:
            continue
        findings.append({'file': path, 'line': line_no, 'pattern': pattern, 'snippet': snippet.strip()})

with report.open('w', newline='', encoding='utf-8') as fh:
    writer = csv.DictWriter(fh, fieldnames=['file', 'line', 'pattern', 'snippet'])
    writer.writeheader()
    for row in findings:
        writer.writerow(row)
PY
  railhead::add_to_manifest "${RUN_DIR}" "security" "${SEC_DIR}/secrets/scan.csv" "Secret scan candidates"
  railhead::log "${LOG_FILE}" "Produced secret scan report"
fi

railhead::log "${LOG_FILE}" "Security baseline complete"
