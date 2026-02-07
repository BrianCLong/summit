#!/usr/bin/env bash
set -euo pipefail

deterministic_dir=${1:-artifacts/deterministic}
runtime_dir=${2:-artifacts/runtime}

mkdir -p "$deterministic_dir" "$runtime_dir"

commit_sha="$(git rev-parse HEAD)"
commit_ref="$(git rev-parse --abbrev-ref HEAD || echo unknown)"

dockerfile_path=${DOCKERFILE_PATH:-Dockerfile}
lockfile_path=${LOCKFILE_PATH:-pnpm-lock.yaml}

dockerfile_hash=""
lockfile_hash=""

if [[ -f "$dockerfile_path" ]]; then
  dockerfile_hash=$(sha256sum "$dockerfile_path" | awk '{print $1}')
fi

if [[ -f "$lockfile_path" ]]; then
  lockfile_hash=$(sha256sum "$lockfile_path" | awk '{print $1}')
fi

pnpm_version=""
if command -v pnpm >/dev/null 2>&1; then
  pnpm_version=$(pnpm --version)
fi

node_version=""
if command -v node >/dev/null 2>&1; then
  node_version=$(node --version)
fi

docker_buildx_version=""
if command -v docker >/dev/null 2>&1; then
  docker_buildx_version=$(docker buildx version 2>/dev/null | head -n1 || true)
fi

python - <<'PY' "$deterministic_dir" "$commit_sha" "$commit_ref" "$dockerfile_path" "$dockerfile_hash" "$lockfile_path" "$lockfile_hash" "$pnpm_version" "$node_version" "$docker_buildx_version"
import json
import sys

(
    deterministic_dir,
    commit_sha,
    commit_ref,
    dockerfile_path,
    dockerfile_hash,
    lockfile_path,
    lockfile_hash,
    pnpm_version,
    node_version,
    docker_buildx_version,
) = sys.argv[1:]

data = {
    "schema_version": "deterministic-stamp-v1",
    "commit_sha": commit_sha,
    "commit_ref": commit_ref,
    "dockerfile": {
        "path": dockerfile_path,
        "sha256": dockerfile_hash,
    },
    "lockfile": {
        "path": lockfile_path,
        "sha256": lockfile_hash,
    },
    "toolchain": {
        "pnpm": pnpm_version,
        "node": node_version,
        "docker_buildx": docker_buildx_version,
    },
}

with open(f"{deterministic_dir}/stamp.json", "w", encoding="utf-8") as handle:
    json.dump(data, handle, indent=2, sort_keys=True)
    handle.write("\n")
PY

created_at=$(date -u +%Y-%m-%dT%H:%M:%SZ)

python - <<'PY' "$runtime_dir" "$created_at"
import json
import os
import sys

runtime_dir, created_at = sys.argv[1:]

data = {
    "schema_version": "runtime-stamp-v1",
    "created_at": created_at,
    "run": {
        "id": os.getenv("GITHUB_RUN_ID"),
        "number": os.getenv("GITHUB_RUN_NUMBER"),
        "attempt": os.getenv("GITHUB_RUN_ATTEMPT"),
        "workflow": os.getenv("GITHUB_WORKFLOW"),
        "job": os.getenv("GITHUB_JOB"),
    },
    "runner": {
        "name": os.getenv("RUNNER_NAME"),
        "os": os.getenv("RUNNER_OS"),
        "arch": os.getenv("RUNNER_ARCH"),
    },
}

with open(f"{runtime_dir}/runtime-stamp.json", "w", encoding="utf-8") as handle:
    json.dump(data, handle, indent=2, sort_keys=True)
    handle.write("\n")
PY
