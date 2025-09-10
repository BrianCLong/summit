#!/usr/bin/env bash
set -euo pipefail
autocannon -d 30 -c 200 -p 10 "$BASE_URL/search?q=graph" --headers 'x-tenant-id: demo'