#!/usr/bin/env bash
set -euo pipefail
pip install -U pip pytest pytest-cov
[ -f requirements.txt ] && pip install -r requirements.txt || true
[ -f pyproject.toml ] && pip install -e . || true