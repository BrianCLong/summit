#!/bin/bash
set -e

echo "🚀 Starting One-Command Dev Setup..."

# Prereq checks
command -v node >/dev/null 2>&1 || { echo >&2 "Node.js required but not installed. Aborting."; exit 1; }
command -v pnpm >/dev/null 2>&1 || { echo >&2 "pnpm required but not installed. Aborting."; exit 1; }

echo "📦 Installing dependencies..."
pnpm install

echo "🏗️ Building..."
pnpm build

echo "✅ Ready! Run 'pnpm dev' to start the stack."
