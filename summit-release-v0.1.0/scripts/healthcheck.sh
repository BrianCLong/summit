#!/usr/bin/env bash
set -euo pipefail
curl -fsS http://server:4000/health >/dev/null