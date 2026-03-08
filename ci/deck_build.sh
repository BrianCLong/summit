#!/usr/bin/env bash
set -euo pipefail
if [[ "${DECK_BUILD:-1}" != "1" ]]; then
  echo "deck build disabled"
  exit 0
fi
if ! command -v latexmk >/dev/null 2>&1; then
  echo "latexmk not installed; skip (configure CI image later)"
  exit 0
fi

OUT="${1:-deck_project}"
pushd "$OUT" >/dev/null
# Strict flags; no shell-escape.
latexmk -pdf -interaction=nonstopmode -halt-on-error -no-shell-escape main.tex
popd >/dev/null
echo "ok: compiled deck"
