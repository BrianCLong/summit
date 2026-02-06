#!/bin/bash
set -e

if [ -f "pnpm-lock.yaml" ]; then
  echo "pnpm"
elif [ -f "yarn.lock" ]; then
  echo "yarn"
else
  echo "npm"
fi
