#!/usr/bin/env bash
set -euo pipefail
BR=chore/opa-coverage
(git checkout -b $BR || git checkout $BR)
FILES="policies/export.rego policies/tests/export_test.rego .github/workflows/opa.yml"
git add $FILES 2>/dev/null || true
git commit -m "chore(opa): canonical tests + coverage gate" || echo "Nothing to commit"
echo "Branch $BR ready. Push and open PR."
