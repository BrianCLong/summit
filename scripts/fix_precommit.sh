#!/usr/bin/env bash
set -euo pipefail

echo "🔧 Repairing pre-commit installation…"
command -v pre-commit >/dev/null 2>&1 || {
  echo "Installing pre-commit via Homebrew…"
  brew install pre-commit || {
    echo "brew failed; trying pipx…"
    brew install pipx && pipx ensurepath && pipx install pre-commit
  }
}

rm -rf "${HOME}/.cache/pre-commit" || true
pre-commit clean || true
pre-commit uninstall || true
pre-commit autoupdate || true
pre-commit install --install-hooks -t pre-commit -t commit-msg

echo "✅ pre-commit repaired."
