#!/bin/bash
set -e
if git diff --cached --name-only | grep -q "revokeEntitlement"; then
  if ! git diff --cached --name-only | grep -q "server/src/transparency"; then
    echo "revocations must be recorded in transparency log" >&2
    exit 1
  fi
fi
