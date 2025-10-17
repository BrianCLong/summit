#!/usr/bin/env bash
set -euo pipefail
kubectl run -it liquid-nano-debug --rm \
  --image=ghcr.io/chainguard-dev/busybox:latest \
  --restart=Never -- /bin/sh
