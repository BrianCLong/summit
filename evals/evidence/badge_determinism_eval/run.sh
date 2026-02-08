#!/usr/bin/env bash
set -euo pipefail

TMP_DIR="${TMP_DIR:-/tmp/badge-determinism}"
rm -rf "$TMP_DIR"
mkdir -p "$TMP_DIR"

export BADGE_LABEL="sbom"
export BADGE_MESSAGE="verified"
export BADGE_COLOR="brightgreen"

BADGE_OUTPUT="$TMP_DIR/badge-a.json" node scripts/ci/write_badge_json.mjs
BADGE_OUTPUT="$TMP_DIR/badge-b.json" node scripts/ci/write_badge_json.mjs

diff -u "$TMP_DIR/badge-a.json" "$TMP_DIR/badge-b.json"
