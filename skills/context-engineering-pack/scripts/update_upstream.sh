#!/usr/bin/env bash
set -euo pipefail

echo "[update] syncing submodule..."
git submodule update --init --recursive skills/vendor/agent-skills-context-engineering

echo "[update] pulling latest upstream..."
(
  cd skills/vendor/agent-skills-context-engineering
  git fetch --tags origin
  git checkout main
  git pull --ff-only origin main
)

echo "[update] done. Commit the updated submodule pointer."
