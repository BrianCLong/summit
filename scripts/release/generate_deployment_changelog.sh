#!/usr/bin/env bash
set -euo pipefail

git log --no-merges --pretty=format:"- %s (%h)"
