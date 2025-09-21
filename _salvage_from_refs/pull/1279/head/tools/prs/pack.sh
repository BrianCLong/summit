#!/usr/bin/env bash
set -euo pipefail
ZIP=${1:-sprint25_pr_scripts.zip}
rm -f "$ZIP"
zip -r "$ZIP" tools/prs/*.sh >/dev/null
echo "Wrote $ZIP"
