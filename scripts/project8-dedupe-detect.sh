#!/usr/bin/env bash
# Detect duplicates in Project #8 by title and Tracker ID
set -euo pipefail
OWNER="${1:-BrianCLong}"
PROJ_NUM="${2:-8}"
OUTDIR="${3:-artifacts}"
mkdir -p "$OUTDIR"

echo "🔎 Collecting Project #$PROJ_NUM items…"
proj_json="$OUTDIR/project${PROJ_NUM}_items_raw.json"
gh project item-list "$PROJ_NUM" --owner "$OWNER" --limit 500 --format json > "$proj_json"

echo "🧭 Building working set (title, project_item_id, issue_url, issue_number)…"
jq -r '
  .items[]?
  | {pid: .id, title: .title, url: .content.url}
  | select(.url != null)
  | . + {num: (.url | split("#") | last)}
' "$proj_json" > "$OUTDIR/_items_min.json"

echo "🔡 Normalizing titles…"
jq -r '
  . as $it
  | [$it.pid,
     ($it.title | ascii_downcase | gsub("\\s+"; "_")),
     $it.title,
     $it.url,
     $it.num] | @tsv
' "$OUTDIR/_items_min.json" > "$OUTDIR/_items_norm.tsv"

echo "🧮 Grouping by normalized title…"
awk -F'\t' '
  { key=$2; cnt[key]++ }
  END { for (k in cnt) if (cnt[k]>1) print k "\t" cnt[k] }
' "$OUTDIR/_items_norm.tsv" | sort -k2,2nr > "$OUTDIR/duplicates_by_title.tsv"

DUP_COUNT=$(wc -l < "$OUTDIR/duplicates_by_title.tsv" | tr -d ' ')
echo "  Found $DUP_COUNT unique titles with duplicates"

echo "🧾 Building review CSV…"
outcsv="$OUTDIR/duplicates_review.csv"
echo "group_key,project_item_id,issue_number,issue_url,title,keep_action,note" > "$outcsv"

# Expand duplicates by title (each duplicate item gets one row)
awk -F'\t' 'NR==FNR{dups[$1]=1; next} dups[$2]==1 {
  gsub(/,/, "&#44;", $3);  # Escape commas in title
  print $2 "," $1 "," $5 "," $4 "," $3 ",TBD,"
}' "$OUTDIR/duplicates_by_title.tsv" "$OUTDIR/_items_norm.tsv" >> "$outcsv"

ROW_COUNT=$(($(wc -l < "$outcsv") - 1))

echo "✅ Detection complete:"
echo "  - Duplicate groups: $DUP_COUNT"
echo "  - Total duplicate items: $ROW_COUNT"
echo ""
echo "📄 Review file: $outcsv"
echo ""
echo "📝 Next steps:"
echo "  1) Edit $outcsv"
echo "  2) For each group_key, set keep_action=KEEP for ONE item"
echo "  3) Set keep_action=REMOVE for all others in that group"
echo "  4) Run: scripts/project8-dedupe-apply.sh"
echo ""
echo "Example: If 3 items have group_key '[maestro-conductor]_sprint-20251027':"
echo "  Row 1: keep_action=KEEP   (the one you want to preserve)"
echo "  Row 2: keep_action=REMOVE"
echo "  Row 3: keep_action=REMOVE"
