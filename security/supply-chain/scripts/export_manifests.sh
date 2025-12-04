#!/usr/bin/env bash
set -euo pipefail

usage() {
  echo "Usage: $0 --sbom <path> --cyclonedx <path> --vulns <path> --licenses <path> --attestation <path>" >&2
  exit 1
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --sbom) SBOM="$2"; shift 2 ;;
    --cyclonedx) CYCLONEDX="$2"; shift 2 ;;
    --vulns) VULNS="$2"; shift 2 ;;
    --licenses) LICENSES="$2"; shift 2 ;;
    --attestation) ATTESTATION="$2"; shift 2 ;;
    *) usage ;;
  esac
done

: "${SBOM:?missing sbom}" "${CYCLONEDX:?missing cyclonedx}" "${VULNS:?missing vulns}" "${LICENSES:?missing licenses}" "${ATTESTATION:?missing attestation}"
: "${COMPLIANCE_CENTER_URL:?missing COMPLIANCE_CENTER_URL}" "${COMPLIANCE_CENTER_TOKEN:?missing COMPLIANCE_CENTER_TOKEN}"

payload=$(cat <<JSON
{
  "artifacts": {
    "spdx": "${SBOM}",
    "cyclonedx": "${CYCLONEDX}",
    "vulnerabilities": "${VULNS}",
    "licenses": "${LICENSES}",
    "attestation": "${ATTESTATION}"
  },
  "metadata": {
    "submitted_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "submitted_by": "github-actions",
    "signature": "$(sha256sum ${SBOM} | cut -d' ' -f1)"
  }
}
JSON
)

echo "Exporting manifests to Compliance Center at ${COMPLIANCE_CENTER_URL}"

curl -sSf -X POST "${COMPLIANCE_CENTER_URL}/api/manifests" \
  -H "Authorization: Bearer ${COMPLIANCE_CENTER_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "${payload}"

echo "Export completed"
