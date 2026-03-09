#!/usr/bin/env bash
set -euo pipefail
echo "Summit RepoOS Quick Demo (as of $(date))"
echo "1. Governor logic     → node scripts/repoos-governor-demo.mjs"
echo "2. GA validation      → node scripts/repoos-ga-validation-showcase.mjs"
echo "3. Repo analysis      → node scripts/repoos-analysis.mjs --help"
echo "4. Dashboard preview  → node scripts/repoos-dashboard.mjs"
echo ""
echo "Pick one (1-4) or pass args directly:"
read -p "> " choice
case $choice in
  1) node scripts/repoos-governor-demo.mjs "$@" ;;
  2) node scripts/repoos-ga-validation-showcase.mjs "$@" ;;
  3) node scripts/repoos-analysis.mjs "$@" ;;
  4) node scripts/repoos-dashboard.mjs "$@" ;;
  *) echo "Running custom: $*" ; node "$@" ;;
esac
