#!/usr/bin/env bash
# Fails if non-DP aggregate appears in clean room code paths
if grep -R "SELECT" server/src/federation/cleanroom 2>/dev/null | grep -v "dp"; then
  echo "Raw aggregates detected without DP"
  exit 1
fi
