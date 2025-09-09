#!/usr/bin/env bash
set -euo pipefail
# Requires: pandoc installed in runner
mkdir -p docs/ops/exports/epub
find docs -name '*.md*' | sort | xargs pandoc -o docs/ops/exports/epub/intelgraph-docs.epub --metadata title='IntelGraph Docs' --toc --css=docs-site/src/css/print.css || echo 'pandoc not present; skipping'