#!/usr/bin/env bash

# Placeholder for metadata collection

mkdir -p build
cat << 'JSON' > build/releases.json
[
  {
    "date": "2026-02-26",
    "release": "v1.4.2",
    "determinism_score": 0.93,
    "gates": { "pass": 152, "fail": 3 }
  }
]
JSON
