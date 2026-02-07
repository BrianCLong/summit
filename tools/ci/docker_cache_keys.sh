#!/usr/bin/env bash
set -euo pipefail

DOCKERFILE_PATH=${1:-Dockerfile}
LOCKFILE_PATH=${2:-pnpm-lock.yaml}

if [[ ! -f "$DOCKERFILE_PATH" ]]; then
  echo "Dockerfile not found at $DOCKERFILE_PATH" >&2
  exit 1
fi

if [[ ! -f "$LOCKFILE_PATH" ]]; then
  echo "Lockfile not found at $LOCKFILE_PATH" >&2
  exit 1
fi

dockerfile_hash=$(sha256sum "$DOCKERFILE_PATH" | awk '{print $1}')
lockfile_hash=$(sha256sum "$LOCKFILE_PATH" | awk '{print $1}')
cache_scope="docker-${dockerfile_hash}-${lockfile_hash}"

if [[ -n "${GITHUB_OUTPUT:-}" ]]; then
  {
    echo "dockerfile_hash=${dockerfile_hash}"
    echo "lockfile_hash=${lockfile_hash}"
    echo "cache_scope=${cache_scope}"
  } >> "$GITHUB_OUTPUT"
else
  echo "$cache_scope"
fi
