#!/usr/bin/env bash
set -e

echo "🚀 Starting Summit Golden Path..."

if [[ "$1" == "--ai" ]]; then
  echo "🤖 AI mode enabled"
  make bootstrap
  make up-ai
else
  make bootstrap
  make up
fi

echo "🔍 Running smoke tests..."
make smoke

echo "✅ Golden Path verified!"
