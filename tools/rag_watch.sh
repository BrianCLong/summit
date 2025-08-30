#!/usr/bin/env bash
set -euo pipefail
[ -f ".orchestra.env" ] && set -a && . ./.orchestra.env && set +a
fd -HI --type f . rag/corpus 2>/dev/null | entr -r just --justfile Justfile.rag rag-build
