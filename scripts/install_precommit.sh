#!/usr/bin/env bash
set -euo pipefail

echo "--- Installing and Enabling Pre-commit Hooks ---"

# Install pipx if not already installed
if ! command -v pipx >/dev/null; then
  echo "Installing pipx..."
  python3 -m pip install --user pipx
  python3 -m pipx ensurepath
  echo "pipx installed. Please restart your terminal or run 'exec bash' (or equivalent) for changes to take effect."
  # Exit here as pipx path might not be immediately available
  exit 0
fi

# Install pre-commit using pipx
if ! command -v pre-commit >/dev/null; then
  echo "Installing pre-commit using pipx..."
  pipx install pre-commit
fi

# Install pre-commit hooks in the repository
echo "Installing pre-commit hooks in the repository..."
pre-commit install

# Run pre-commit on all files once
echo "Running pre-commit on all files once..."
pre-commit run --all-files

echo "--- Pre-commit Setup Complete ---"
