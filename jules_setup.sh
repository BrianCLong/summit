#!/bin/bash
# Deterministic setup script for Jules

set -e

echo "--- Running Jules Setup Script ---"

# 1. Version Checks
echo "--- Checking versions ---"
node -v
pnpm -v
python3 -V

# Add explicit version checks here if needed, for example:
# node -v | grep -q "v20" || (echo "Node.js version 20 is required" && exit 1)
# python3 -V | grep -q "Python 3.11" || (echo "Python 3.11 is required" && exit 1)

# 2. Install dependencies
echo "--- Bootstrapping environment ---"
make bootstrap

# 3. Start the stack
echo "--- Starting the application stack ---"
# Use sudo for Docker commands to avoid permission issues
sudo make up

# 4. Run smoke tests
echo "--- Running smoke tests ---"
echo "Waiting for services to start..."
sleep 45
echo "Checking UI health..."
curl -s -f http://localhost:3000 > /dev/null && echo "✅ UI is up" || (echo "❌ UI failed" && exit 1)
echo "Checking Gateway health..."
curl -s -f http://localhost:8080/healthz > /dev/null && echo "✅ Gateway is up" || (curl -s -f http://localhost:8080/health > /dev/null && echo "✅ Gateway is up" || (echo "❌ Gateway failed" && exit 1))
echo "Smoke test complete."

echo "--- Jules Setup Script Completed Successfully ---"
