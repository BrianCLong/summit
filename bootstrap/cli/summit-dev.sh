#!/bin/bash
# Developer bootstrap script
# Installs dependencies and initializes the runtime

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
BOOTSTRAP_ROOT="$(dirname "$DIR")"

echo "Setting up Summit Dev Environment..."
cd "$BOOTSTRAP_ROOT"
npm install

echo "Initializing Runtime..."
"$DIR/summit.sh" init

echo "Dev environment ready."
