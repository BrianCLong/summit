#!/usr/bin/env bash
set -euo pipefail
BASE="${1:-main}"
BRANCH="${2:-$(git rev-parse --abbrev-ref HEAD)}"
echo "Scanning ${BRANCH} vs ${BASE} for duplicate patches…"
git log -p "${BASE}...${BRANCH}" | git patch-id --stable | awk '{print $1}' | sort | uniq -d | wc -l | xargs -I{} echo "Duplicate patch-ids: {} (0 is ideal)"
