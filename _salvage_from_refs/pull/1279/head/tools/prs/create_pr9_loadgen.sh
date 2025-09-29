#!/usr/bin/env bash
set -euo pipefail
BR=feat/tooling-demo-loadgen
(git checkout -b $BR || git checkout $BR)
FILES="tools/loadgen/loadgen.py tools/loadgen/Dockerfile Makefile"
git add $FILES 2>/dev/null || true
git commit -m "feat(tooling): async load generator + Dockerfile + make demo-load" || echo "Nothing to commit"
echo "Branch $BR ready. Push and open PR."
