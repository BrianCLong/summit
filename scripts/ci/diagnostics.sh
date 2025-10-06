#!/usr/bin/env bash
set -euo pipefail
echo "Recent workflow changes (30d):"
git log --since="30 days ago" -- .github/workflows | sed -n '1,200p' || true
echo
echo "Actions used:"
grep -R "uses:" .github/workflows | sed 's/^[^:]*://'
echo
echo "Declared job names:"
jq -r '.jobs|keys[]' .github/workflows/*.yml 2>/dev/null | sort -u || true
echo
echo "Secrets referenced:"
grep -R "\${{ secrets\." .github/workflows | sed 's/^[^:]*://'
echo
echo "Current required status checks (main):"
gh api repos/:owner/:repo/branches/main/protection | jq '.required_status_checks.contexts' || true
