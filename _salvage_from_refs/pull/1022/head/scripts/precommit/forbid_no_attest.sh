#!/bin/bash
set -e
if git grep -q "debug_no_attest" -- ':!scripts/precommit/forbid_no_attest.sh'; then
  echo "debug_no_attest flag detected" >&2
  exit 1
fi
