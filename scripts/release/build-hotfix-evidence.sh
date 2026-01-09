#!/usr/bin/env bash
# build-hotfix-evidence.sh
# Creates a signed evidence bundle for hotfix releases.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || echo ".")"

TAG=""
COMMIT_SHA=""
BASE_TAG=""
OUTPUT_DIR="${REPO_ROOT}/artifacts/hotfix-evidence"
POLICY_FILE="${REPO_ROOT}/release/HOTFIX_POLICY.yml"

usage() {
  cat <<'USAGE'
Usage: build-hotfix-evidence.sh --tag vX.Y.Z --commit SHA --base-tag vX.Y.Z [options]

Options:
  --tag TAG            Target hotfix tag (required)
  --commit SHA         Hotfix commit SHA (required)
  --base-tag TAG       GA base tag (required)
  --output DIR         Output directory (default: artifacts/hotfix-evidence)
  --policy FILE        Hotfix policy file (default: release/HOTFIX_POLICY.yml)
  --help               Show this help
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --tag)
      TAG="$2"
      shift 2
      ;;
    --commit)
      COMMIT_SHA="$2"
      shift 2
      ;;
    --base-tag)
      BASE_TAG="$2"
      shift 2
      ;;
    --output)
      OUTPUT_DIR="$2"
      shift 2
      ;;
    --policy)
      POLICY_FILE="$2"
      shift 2
      ;;
    --help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      usage
      exit 2
      ;;
  esac
done

if [[ -z "$TAG" || -z "$COMMIT_SHA" || -z "$BASE_TAG" ]]; then
  echo "Missing required arguments." >&2
  usage
  exit 2
fi

mkdir -p "$OUTPUT_DIR"

GOV_DIR="${OUTPUT_DIR}/governance"

"${SCRIPT_DIR}/generate_governance_lockfile.sh" \
  --sha "${COMMIT_SHA}" \
  --tag "${TAG}" \
  --out-dir "${GOV_DIR}"

"${SCRIPT_DIR}/sign_governance_lockfile.sh" \
  --mode sign \
  --subject "${GOV_DIR}/governance_SHA256SUMS" \
  --out-dir "${GOV_DIR}/signatures" \
  --tag "${TAG}" \
  --sha "${COMMIT_SHA}"

SIGNATURE_METHOD=$(jq -r '.method // "unknown"' "${GOV_DIR}/signatures/metadata.json")
if [[ "${SIGNATURE_METHOD}" == "unsigned" || "${SIGNATURE_METHOD}" == "unknown" ]]; then
  echo "Evidence signing failed or unsigned. Method: ${SIGNATURE_METHOD}" >&2
  exit 1
fi

"${SCRIPT_DIR}/extract_required_checks_from_policy.sh" \
  --policy "${POLICY_FILE}" \
  --out "${OUTPUT_DIR}/required_checks_policy.json"

cat > "${OUTPUT_DIR}/hotfix_evidence.json" <<EOF
{
  "version": "1.0.0",
  "tag": "${TAG}",
  "base_tag": "${BASE_TAG}",
  "commit_sha": "${COMMIT_SHA}",
  "generated_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "workflow": {
    "run_id": "${GITHUB_RUN_ID:-unknown}",
    "run_url": "${GITHUB_SERVER_URL:-https://github.com}/${GITHUB_REPOSITORY:-}/actions/runs/${GITHUB_RUN_ID:-}"
  }
}
EOF

pushd "${OUTPUT_DIR}" >/dev/null
find . -type f ! -name SHA256SUMS ! -name evidence.tar.gz ! -name evidence.sha256 -print0 \
  | sort -z \
  | xargs -0 sha256sum > SHA256SUMS

if tar --version 2>/dev/null | grep -q "GNU"; then
  tar --sort=name --mtime='UTC 1970-01-01' --owner=0 --group=0 --numeric-owner \
    -czf evidence.tar.gz \
    --exclude=evidence.tar.gz \
    --exclude=evidence.sha256 \
    --exclude=SHA256SUMS \
    .
else
  tar -czf evidence.tar.gz --exclude=evidence.tar.gz --exclude=evidence.sha256 --exclude=SHA256SUMS .
fi

sha256sum evidence.tar.gz | awk '{print $1}' > evidence.sha256
EVIDENCE_SHA256=$(cat evidence.sha256)

cat > evidence_summary.json <<SUMMARY
{
  "version": "1.0.0",
  "evidence_sha256": "${EVIDENCE_SHA256}",
  "signature_method": "${SIGNATURE_METHOD}",
  "signature": {
    "subject": "governance/governance_SHA256SUMS",
    "sig_path": "governance/signatures/governance_SHA256SUMS.sig",
    "cert_path": "governance/signatures/governance_SHA256SUMS.cert",
    "metadata_path": "governance/signatures/metadata.json"
  }
}
SUMMARY

popd >/dev/null

echo "Evidence SHA256: ${EVIDENCE_SHA256}"
