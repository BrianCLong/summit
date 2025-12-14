#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'USAGE'
Usage: scripts/ops/new-incident.sh "<short title>"

Creates a new incident markdown file in docs/incidents/ using the template.
Incident IDs follow INC-YYYYMMDD-XXX (zero-padded sequence per day).
USAGE
}

if [[ ${1-} == "-h" || ${1-} == "--help" ]]; then
  usage
  exit 0
fi

if [[ $# -lt 1 ]]; then
  echo "Error: incident title is required" >&2
  usage
  exit 1
fi

SCRIPT_DIR="$(cd -- "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd -- "${SCRIPT_DIR}/../.." && pwd)"
INCIDENT_DIR="${REPO_ROOT}/docs/incidents"
TEMPLATE_FILE="${INCIDENT_DIR}/template.md"

if [[ ! -f "${TEMPLATE_FILE}" ]]; then
  echo "Template not found at ${TEMPLATE_FILE}" >&2
  exit 1
fi

mkdir -p "${INCIDENT_DIR}"

DATE_STAMP="$(date -u +%Y%m%d)"
count=$(( $(find "${INCIDENT_DIR}" -maxdepth 1 -name "INC-${DATE_STAMP}-*.md" | wc -l) + 1 ))
SEQ=$(printf "%03d" "${count}")
INCIDENT_ID="INC-${DATE_STAMP}-${SEQ}"
FILE_PATH="${INCIDENT_DIR}/${INCIDENT_ID}.md"

if [[ -f "${FILE_PATH}" ]]; then
  echo "Incident file ${FILE_PATH} already exists" >&2
  exit 1
fi

TITLE="$1"
START_TIME="$(date -u +"%Y-%m-%d %H:%M:%SZ")"

sed \
  -e "s/{{INCIDENT_ID}}/${INCIDENT_ID}/g" \
  -e "s/{{INCIDENT_TITLE}}/${TITLE}/g" \
  -e "s/{{SEVERITY}}/TBD/g" \
  -e "s/{{START_TIME}}/${START_TIME}/g" \
  -e "s/{{DECLARED_BY}}/$(whoami)/g" \
  -e "s/{{INCIDENT_COMMANDER}}/TBD/g" \
  -e "s/{{SCRIBE}}/TBD/g" \
  -e "s/{{SML}}/TBD/g" \
  -e "s/{{STATUS_PAGE_LINK}}/TBD/g" \
  -e "s/{{MITIGATION_STATUS}}/TBD/g" \
  -e "s/{{SLACK_THREAD_LINK}}/TBD/g" \
  "${TEMPLATE_FILE}" > "${FILE_PATH}"

echo "Created ${FILE_PATH}"
