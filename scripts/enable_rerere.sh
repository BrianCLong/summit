#!/usr/bin/env bash
set -euo pipefail
git config rerere.enabled true
git config rerere.autoUpdate true
git config rerere.log true
echo "git rerere enabled ✅"
