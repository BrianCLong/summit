#!/usr/bin/env bash
set -euo pipefail

say() { printf "\033[1;34m[pre-commit]\033[0m %s\n" "$*"; }

# 1) If pre-commit already on PATH, use it.
if command -v pre-commit >/dev/null 2>&1; then
  say "pre-commit found on PATH"
  git config --unset-all core.hooksPath || true # Unset hooksPath to allow pre-commit to install
  pre-commit install
  pre-commit run --all-files || true
  exit 0
fi

# 2) Try pipx run (works without PATH modification)
if command -v pipx >/dev/null 2>&1; then
  say "using pipx run pre-commit"
  git config --unset-all core.hooksPath || true # Unset hooksPath to allow pre-commit to install
  pipx run pre-commit install
  pipx run pre-commit run --all-files || true
  exit 0
fi

# 3) Try python -m (user install; no PATH edits needed)
if command -v python >/dev/null 2>&1; then
  say "installing via python -m pip --user"
  python -m pip install --user --upgrade pre-commit
  git config --unset-all core.hooksPath || true # Unset hooksPath to allow pre-commit to install
  python -m pre_commit install
  python -m pre_commit run --all-files || true
  exit 0
fi

# 4) Last resort: local venv
say "bootstrapping local venv .pc-venv"
python3 -m venv .pc-venv
./.pc-venv/bin/pip install --upgrade pip pre-commit
./.pc-venv/bin/pre-commit install
./.pc-venv/bin/pre-commit run --all-files || true