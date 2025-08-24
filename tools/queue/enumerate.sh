#!/usr/bin/env bash
set -euo pipefail

# Enumerate open PRs (latest-first), classify into waves, write /tmp/waves.tsv
# Requirements: gh, jq

if ! command -v gh >/dev/null 2>&1; then
  echo "[!] GitHub CLI (gh) is required. Install via https://cli.github.com/" >&2
  exit 1
fi
if ! command -v jq >/dev/null 2>&1; then
  echo "[!] jq is required. Install via your package manager." >&2
  exit 1
fi

TMP_JSON="/tmp/prs_list.json"
WAVES_TSV="/tmp/waves.tsv"
> "$WAVES_TSV"

echo "[i] Fetching open PRs (latest-first)…"
gh pr list --state open --sort updated --order desc \
  --json number,headRefName,title,updatedAt > "$TMP_JSON"

COUNT=$(jq 'length' "$TMP_JSON")
echo "[i] Found $COUNT open PR(s). Classifying…"

# Iterate PRs and classify by changed paths (requires an extra gh call per PR)
for PR in $(jq -r '.[].number' "$TMP_JSON"); do
  # Collect file paths for this PR
  mapfile -t FILES < <(gh pr view "$PR" --json files -q '.files[].path')

  isDocs=false
  isCode=false
  isInfra=false

  for f in "${FILES[@]:-}"; do
    [[ -z "${f:-}" ]] && continue
    if [[ $f =~ ^docs/ || $f =~ ^scripts/ || $f =~ \.md$ ]]; then
      isDocs=true
    fi
    if [[ $f =~ ^schema/ || $f =~ ^apps/gateway || $f =~ ^services/ || $f =~ ^server/ || $f =~ ^client/ ]]; then
      isCode=true
    fi
    if [[ $f =~ ^migrations/ || $f =~ ^server/db/ || $f =~ ^policy/ || $f =~ ^deploy/ ]]; then
      isInfra=true
    fi
  done

  wave=1
  if [[ "$isDocs" == true && "$isCode" == false && "$isInfra" == false ]]; then
    wave=0
  elif [[ "$isInfra" == true ]]; then
    wave=3
  elif [[ "$isCode" == true ]]; then
    # Randomly bucket into wave 1 or 2 to reduce conflicts
    if (( RANDOM % 2 )); then wave=1; else wave=2; fi
  else
    wave=1
  fi

  printf "%s\t%s\n" "$wave" "$PR" >> "$WAVES_TSV"
done

sort -n -k1,1 "$WAVES_TSV" -o "$WAVES_TSV"

echo "[i] Waves written to $WAVES_TSV"
echo "[i] Wave distribution:" \
  && awk '{c[$1]++} END {for (w in c) printf "  wave %s: %s PR(s)\n", w, c[w]}' "$WAVES_TSV" | sort -V

