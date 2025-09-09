#!/usr/bin/env bash
set -euo pipefail
mkdir -p docs-site/static/fonts/subset
pyftsubset docs-site/static/fonts/Inter-Variable.ttf --output-file=docs-site/static/fonts/subset/Inter-Subset.woff2 --text-file=scripts/perf/common-chars.txt --flavor=woff2 --layout-features='*' --unicodes='U+000-5FF'