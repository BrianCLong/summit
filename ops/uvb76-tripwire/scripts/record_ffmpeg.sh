#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 2 ]]; then
  echo "Usage: $0 <stream-url> <label> [output-dir]" >&2
  exit 1
fi

stream_url=$1
label=$2
out_dir=${3:-"captures"}

mkdir -p "${out_dir}"

while true; do
  ffmpeg -hide_banner -loglevel error -i "${stream_url}" \
    -ac 1 -ar 8000 -f segment -segment_time 300 -strftime 1 \
    "${out_dir}/${label}_%Y%m%d_%H%M%S.wav" || true
  sleep 1
done
