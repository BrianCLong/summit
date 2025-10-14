#!/usr/bin/env bash
set -euo pipefail

echo "==> Checking prerequisites"
if ! command -v node >/dev/null; then echo "Install Node.js >= 20"; exit 1; fi
if ! command -v cargo >/dev/null; then echo "Install Rust (rustup)"; exit 1; fi

echo "==> Installing root deps"
npm install

echo "==> Installing web deps"
pushd apps/web >/dev/null
npm install
popd >/dev/null

echo "==> Installing Tauri CLI (if needed)"
if ! command -v cargo-tauri >/dev/null; then
  cargo install tauri-cli
fi

echo "==> Initializing git repo"
if [ ! -d .git ]; then
  git init
  git add -A
  git commit -m "feat: Switchboard repo skeleton v0.1"
fi

echo "==> Done. Try: make dev  # then in another terminal: make tauri-dev"
