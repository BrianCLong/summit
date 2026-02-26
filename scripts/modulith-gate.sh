#!/bin/bash
set -e

echo "🚀 Starting Modulith Gate..."

# Ensure we are in the repo root
cd "$(dirname "$0")/.."

# Run the verifier
make modulith-check

echo "✅ Modulith Gate passed!"
