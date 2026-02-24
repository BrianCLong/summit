#!/usr/bin/env bash
set -euo pipefail

BASE_DIR="${1:-/private/tmp}"
LOG_DIR="${2:-/tmp}"

worktrees=(
  "$BASE_DIR/summit-ga2-security"
  "$BASE_DIR/summit-ga2-deps"
  "$BASE_DIR/summit-ga2-quality"
  "$BASE_DIR/summit-ga2-perf"
  "$BASE_DIR/summit-ga2-integration"
)

for wt in "${worktrees[@]}"; do
  name="$(basename "$wt")"
  log="$LOG_DIR/$name-materialize.log"
  echo "[$(date +%H:%M:%S)] materializing $wt -> $log"
  if [ ! -f "$wt/.git" ]; then
    echo "missing worktree: $wt" | tee -a "$log"
    continue
  fi
  git -C "$wt" reset --hard HEAD >"$log" 2>&1
done

echo "done"
