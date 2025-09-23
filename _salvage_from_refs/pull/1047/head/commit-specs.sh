#!/usr/bin/env bash
set -euo pipefail

# === USAGE CHECK ===
if [ "$#" -ne 1 ]; then
  echo "Usage: $0 /full/path/to/specs.md"
  exit 1
fi

SRC_FILE="$1"

# === CONFIG ===
REPO="BrianCLong/intelgraph-platform"
<<<<<<< HEAD
PAT=$GH_TOKEN
=======
>>>>>>> e9a2927 (chore: remove hardcoded token; use env var)
DEST_FILE="docs/platform_requirements.md"
COMMIT_MSG="docs: add updated platform requirements"

# === VALIDATE ===
if [ ! -f "$SRC_FILE" ]; then
  echo "❌ File not found: $SRC_FILE"
  exit 1
fi

# === CLONE OR PULL ===
if [ ! -d "${REPO##*/}" ]; then
  git clone "https://${PAT}@github.com/${REPO}.git"
fi

cd "${REPO##*/}"
git checkout main
git pull origin main

# === COPY AND RENAME ===
mkdir -p docs
cp "$SRC_FILE" "$DEST_FILE"

# === COMMIT & PUSH ===
git add "$DEST_FILE"
git commit -m "$COMMIT_MSG"
git push "https://${PAT}@github.com/${REPO}.git" main

echo "✅ File committed to ${REPO} in docs/ as ${DEST_FILE}"
