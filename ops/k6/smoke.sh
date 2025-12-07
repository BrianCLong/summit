#!/usr/bin/env bash
set -euo pipefail

echo "Running k6 smoke against ${TARGET:-http://localhost:8080}" || true
