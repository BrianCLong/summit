#!/bin/bash

# Summit Dev Environment Setup

echo "Setting up Summit Development Environment..."

# 1. Check dependencies
echo "Checking dependencies..."
command -v node >/dev/null 2>&1 || { echo >&2 "Node.js is required but not installed. Aborting."; exit 1; }

# 2. Install dependencies
echo "Installing dependencies..."
if [ -f "package.json" ]; then
    npm install
fi

# 3. Initialize Summit
echo "Initializing Summit..."
./bootstrap/cli/summit.sh init

echo "Dev environment ready. Run './bootstrap/cli/summit.sh' to interact."
