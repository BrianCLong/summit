#!/bin/bash
set -e
# Detect case-insensitive file collisions
python3 -c '
import sys
import os
from collections import defaultdict

# Get all tracked files
try:
    files = [f.strip() for f in os.popen("git ls-files").readlines()]
except Exception as e:
    print(f"Error listing files: {e}")
    sys.exit(1)

d = defaultdict(list)
for f in files:
    d[f.lower()].append(f)

bad = [v for v in d.values() if len(v) > 1]
if bad:
    print("CASE COLLISION DETECTED:")
    for v in bad:
        print(f"  {v}")
    sys.exit(1)
else:
    print("OK: No case collisions found.")
'
