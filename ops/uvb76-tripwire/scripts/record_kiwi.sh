#!/usr/bin/env bash
set -euo pipefail

out_dir=${1:-"captures"}
mkdir -p "${out_dir}"

python3 -m kiwiclient.kiwirecorder \
  -s kiwisdr.example.net -p 8073 \
  -f 4625.0 -m usb -L 300 -H 3000 \
  -T 0 -r -w -q 1 \
  -o "${out_dir}" -D buzzer_eu_%Y%m%d_%H%M%S.wav &

python3 -m kiwiclient.kiwirecorder \
  -s kiwisdr.me.example.org -p 8073 \
  -f 5448.0 -m usb -L 300 -H 3000 \
  -T 0 -r -w -q 1 \
  -o "${out_dir}" -D pip_me_%Y%m%d_%H%M%S.wav &

python3 -m kiwiclient.kiwirecorder \
  -s kiwisdr.na.example.com -p 8073 \
  -f 4625.0 -m usb -L 300 -H 3000 \
  -T 0 -r -w -q 1 \
  -o "${out_dir}" -D buzzer_na_%Y%m%d_%H%M%S.wav &

wait
