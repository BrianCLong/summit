#!/bin/bash
# SlopGuard hook for summitctl

set -e

ARTIFACT=$1

if [ -z "$ARTIFACT" ]; then
  echo "Usage: summitctl slopguard <artifact.json>"
  exit 1
fi

export PYTHONPATH=$PYTHONPATH:.
python3 summit/slopguard/cli.py --artifact "$ARTIFACT"
