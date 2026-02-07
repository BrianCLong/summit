#!/usr/bin/env bash
set -euo pipefail

context=${1:-.}
dockerfile=${2:-Dockerfile}
output_dir=${3:-artifacts/repro}

mkdir -p "$output_dir"

source_date_epoch=$(git log -1 --format=%ct)

build_once() {
  local metadata_file=$1
  docker buildx build \
    --file "$dockerfile" \
    --progress=plain \
    --provenance=false \
    --sbom=false \
    --no-cache \
    --build-arg SOURCE_DATE_EPOCH="$source_date_epoch" \
    --metadata-file "$metadata_file" \
    "$context"
}

metadata_a="$output_dir/metadata_a.json"
metadata_b="$output_dir/metadata_b.json"

build_once "$metadata_a"
build_once "$metadata_b"

python - <<'PY' "$metadata_a" "$metadata_b" "$output_dir"
import json
import sys
from pathlib import Path

metadata_a, metadata_b, output_dir = sys.argv[1:]


def read_digest(path: str) -> str:
    data = json.loads(Path(path).read_text(encoding="utf-8"))
    return (
        data.get("containerimage.digest")
        or data.get("containerimage", {}).get("digest")
        or data.get("containerimage.descriptor", {}).get("digest")
        or ""
    )


digest_a = read_digest(metadata_a)
digest_b = read_digest(metadata_b)

metrics = {
    "digest_a": digest_a,
    "digest_b": digest_b,
    "digest_match": digest_a == digest_b,
}

Path(f"{output_dir}/metrics.json").write_text(
    json.dumps(metrics, indent=2, sort_keys=True) + "\n",
    encoding="utf-8",
)

if digest_a != digest_b:
    diff_report = {
        "error": "digest_mismatch",
        "digest_a": digest_a,
        "digest_b": digest_b,
        "metadata_a": metadata_a,
        "metadata_b": metadata_b,
    }
    Path(f"{output_dir}/diff_report.json").write_text(
        json.dumps(diff_report, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )
    sys.exit(1)
PY
