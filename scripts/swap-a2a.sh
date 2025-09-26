#!/usr/bin/env bash
set -euo pipefail
# Usage: scripts/swap-a2a.sh https://agent.example.com
URL=${1:?A2A base URL required}
sed -i.bak -E "s|^A2A_URL=.*$|A2A_URL=${URL}|" .env || true
echo "A2A_URL set to ${URL}. You can now: make all"