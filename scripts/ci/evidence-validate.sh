#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
DEFAULT_BUNDLE="${ROOT_DIR}/scripts/ci/__fixtures__/evidence-validate/pass"

if [[ "${1:-}" == "--help" ]]; then
  echo "Usage: $(basename "$0") [bundle_dir]" >&2
  echo "Defaults to: ${DEFAULT_BUNDLE}" >&2
  exit 0
fi

BUNDLE_DIR="${1:-$DEFAULT_BUNDLE}"

python3 "${ROOT_DIR}/tools/ci/evidence_validate_bundle.py" "${BUNDLE_DIR}"
