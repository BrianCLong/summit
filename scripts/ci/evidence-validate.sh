#!/usr/bin/env bash
set -euo pipefail

bundle_dir="${1:-.}"
python3 tools/ci/evidence_validate_bundle.py "$bundle_dir"
