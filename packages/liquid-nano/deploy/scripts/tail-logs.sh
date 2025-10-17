#!/usr/bin/env bash
set -euo pipefail
kubectl logs -f deployment/liquid-nano "$@"
