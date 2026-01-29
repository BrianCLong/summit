#!/bin/bash
<<<<<<< HEAD
=======
set -e

>>>>>>> 50f8d7925a (feat: add golden path E2E test harness for consolidated frontend)
if [ -f "pnpm-lock.yaml" ]; then
  echo "pnpm"
elif [ -f "yarn.lock" ]; then
  echo "yarn"
else
  echo "npm"
fi
