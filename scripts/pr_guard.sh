#!/usr/bin/env bash
# scripts/pr_guard.sh
set -euo pipefail

# --- config (override via env) ---
STRICT="${STRICT:-false}"            # or pass --strict
MAX_FILES="${MAX_FILES:-200}"        # warn/block if changed files > this
MAX_FILE_MB="${MAX_FILE_MB:-5}"      # non-text over this must be LFS
BASE_REF="${BASE_REF:-origin/main}"  # comparison base

# --- cli flags ---
if [[ "${1:-}" == "--strict" ]]; then STRICT=true; shift; fi
if [[ "${1:-}" == "--base" && -n "${2:-}" ]]; then BASE_REF="$2"; shift 2; fi

die() { echo "✖ $*" >&2; exit 1; }
warn() { echo "⚠ $*" >&2; }

git rev-parse --is-inside-work-tree >/dev/null || die "Run inside a git repo"

# Ensure base exists (CI and local both fine)
git fetch -q origin --depth=50 || true
git rev-parse --verify "$BASE_REF" >/dev/null || die "Base ref '$BASE_REF' not found"

## 1) Conflict markers anywhere in tree
if grep -R --line-number -E '^(<<<<<<<|=======|>>>>>>>)' -- . ':(exclude).git' ; then
  $STRICT && die "Conflict markers present" || warn "Conflict markers present"
fi

## 2) Changed files vs base
mapfile -t CHANGED < <(git diff --name-only "$BASE_REF"...HEAD)
COUNT=${#CHANGED[@]}
if (( COUNT == 0 )); then
  echo "✓ No changes vs $BASE_REF"; exit 0
fi

## 3) Denylist paths (dbs/caches/artifacts)
DENY_REGEX='(^neo4j/|^data/|^datasets/|^logs/|^tmp/|^temp/|^\.gradle/|^dist/|^build/|^out/|^target/|\.db$|\.sqlite)'

if printf '%s\n' "${CHANGED[@]}" | grep -E "$DENY_REGEX" >/dev/null; then
  MSG="Offender paths detected in diff (db/cache/artifact)."
  $STRICT && die "$MSG" || warn "$MSG"
fi

## 4) Large non-text files that are NOT proper LFS pointers
threshold_bytes=$(( MAX_FILE_MB * 1024 * 1024 ))
bad_large=()
for f in "${CHANGED[@]}"; do
  [[ -f "$f" ]] || continue
  sz=$(wc -c <"$f")
  (( sz > threshold_bytes )) || continue

  # if it's text, allow (e.g., big JSON); otherwise require LFS pointer
  if file -b --mime-type "$f" | grep -q '^text/'; then
    continue
  fi

  # valid LFS pointer starts with the version line
  if head -n1 "$f" | grep -q '^version https://git-lfs.github.com/spec'; then
    continue
  fi

  bad_large+=("$f ($((sz/1024/1024))MB)")
done

if ((${#bad_large[@]})); then
  printf '✖ Non-text > %sMB not in LFS:\n' "$MAX_FILE_MB" >&2
  printf '  - %s\n' "${bad_large[@]}" >&2
  $STRICT && exit 1 || warn "Large non-text files must be LFS pointers"
fi

## 5) Huge PR size
if (( COUNT > MAX_FILES )); then
  MSG="Large change ($COUNT files > MAX_FILES=$MAX_FILES). Consider splitting."
  $STRICT && die "$MSG" || warn "$MSG"
fi

echo "✓ PR guard passed (${COUNT} files)."
