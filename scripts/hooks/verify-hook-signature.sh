#!/usr/bin/env bash
set -euo pipefail

SIGNATURE_FILE="${LEFTHOOK_SIGNATURE_FILE:-.lefthook-signature}"
TARGET_FILE="lefthook.yml"

if [[ ! -f "$SIGNATURE_FILE" ]]; then
  echo "Missing signature file: $SIGNATURE_FILE" >&2
  exit 1
fi

if [[ ! -f "$TARGET_FILE" ]]; then
  echo "Missing target file: $TARGET_FILE" >&2
  exit 1
fi

expected="$(cut -d' ' -f1 "$SIGNATURE_FILE")"
actual="$(sha256sum "$TARGET_FILE" | awk '{print $1}')"

if [[ "$expected" != "$actual" ]]; then
  cat >&2 <<'MSG'
lefthook.yml signature mismatch.
Run `sha256sum lefthook.yml > .lefthook-signature` and review the diff.
MSG
  exit 1
fi

exit 0

