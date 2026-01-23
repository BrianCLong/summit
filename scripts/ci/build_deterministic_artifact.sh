#!/usr/bin/env bash
set -euo pipefail

# Deterministic artifact builder:
# - stable file ordering
# - stable metadata (mtime/owner/group)
# - excludes VCS + caches
# Produces: artifacts/build.tar.gz

OUTDIR="artifacts"
OUT="$OUTDIR/build.tar.gz"

mkdir -p "$OUTDIR"

# Prefer building real dist/ if present; otherwise archive repo tree deterministically.
# If you have a build output directory, add it to INCLUDE_DIRS in priority order.
INCLUDE_DIRS=()
if [ -d dist ]; then INCLUDE_DIRS+=("dist"); fi
if [ -d build ]; then INCLUDE_DIRS+=("build"); fi

if [ "${#INCLUDE_DIRS[@]}" -gt 0 ]; then
  TAR_INPUTS=("${INCLUDE_DIRS[@]}")
else
  TAR_INPUTS=(".")
fi

# Create a deterministic tarball (GNU tar options).
# Note: On ubuntu-latest, tar is GNU tar.
tar \
  --sort=name \
  --mtime='UTC 1970-01-01' \
  --owner=0 --group=0 --numeric-owner \
  --pax-option=exthdr.name=%d/PaxHeaders/%f,delete=atime,delete=ctime \
  --exclude-vcs \
  --exclude='.git' \
  --exclude='node_modules' \
  --exclude='**/.cache' \
  --exclude='**/tmp' \
  -czf "$OUT" "${TAR_INPUTS[@]}"

echo "Wrote $OUT"
ls -lh "$OUT"
