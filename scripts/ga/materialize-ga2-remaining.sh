#!/usr/bin/env bash
set -euo pipefail

for d in /private/tmp/summit-ga2-quality /private/tmp/summit-ga2-perf /private/tmp/summit-ga2-integration; do
  echo "materializing $d"
  git -C "$d" reset --hard HEAD
done
