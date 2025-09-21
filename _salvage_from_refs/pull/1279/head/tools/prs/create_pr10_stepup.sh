#!/usr/bin/env bash
set -euo pipefail
BR=feat/stepup-stub
(git checkout -b $BR || git checkout $BR)
FILES="services/auth/stepup.go services/export/stepup_mw.go"
git add $FILES 2>/dev/null || true
git commit -m "feat(auth): step-up token stub + enforcement middleware (dev-only)" || echo "Nothing to commit"
echo "Branch $BR ready. Push and open PR."
