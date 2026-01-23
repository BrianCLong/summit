#!/usr/bin/env bash
set -euo pipefail
sha=$(sha256sum package-lock.json pnpm-lock.yaml poetry.lock 2>/dev/null | sha256sum | cut -d' ' -f1)
echo "ENV_HASH=$sha" >> $GITHUB_ENV