#!/usr/bin/env bash
set -euo pipefail
ARTIFACTS_DIR=.evidence
rm -rf "$ARTIFACTS_DIR" && mkdir -p "$ARTIFACTS_DIR"
# collect
cp -v ops/k6/*.js "$ARTIFACTS_DIR"/ || true
npm --prefix api test -- --reporters=default --json --outputFile="$ARTIFACTS_DIR/api-tests.json" || true
npm --prefix ingest test -- --reporters=default --json --outputFile="$ARTIFACTS_DIR/ingest-tests.json" || true
# optional: k6 summaries if installed
command -v k6 >/dev/null && k6 run --summary-export "$ARTIFACTS_DIR/api-k6.json" ops/k6/api-smoke.js || true
command -v k6 >/dev/null && k6 run --summary-export "$ARTIFACTS_DIR/cypher-k6.json" ops/k6/cypher-load.js || true
# manifest
( cd "$ARTIFACTS_DIR" && find . -type f -print0 | sort -z | xargs -0 shasum -a 256 > MANIFEST.sha256 )
# tarball
TS=$(date -u +%Y%m%dT%H%M%SZ)
TAR="evidence_$TS.tgz"
tar -czf "$TAR" -C "$ARTIFACTS_DIR" .
shasum -a 256 "$TAR" > "$TAR.sha256"
echo "Bundle: $TAR"
