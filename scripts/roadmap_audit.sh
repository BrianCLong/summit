#!/usr/bin/env bash
set -euo pipefail

need() { command -v "$1" >/dev/null || { echo "missing $1"; exit 1; }; }
need gh; need jq
REPO_JSON=$(gh repo view --json owner,name)
OWNER=$(echo "$REPO_JSON" | jq -r .owner.login)
REPO=$(echo "$REPO_JSON" | jq -r .name)
PROJECT_TITLE="${PROJECT_TITLE:-Assistant v1.1}"

read_project() {
  gh api graphql -F owner="$OWNER" -F repo="$REPO" -F title="$PROJECT_TITLE" -F items=200 -f query='
    query($owner:String!,$repo:String!,$title:String!,$items:Int!) {
      repository(owner:$owner, name:$repo) {
        projectsV2(first:20, query:$title) {
          nodes {
            id title
            fields(first:50) {
              nodes {
                ... on ProjectV2SingleSelectField { id name options { id name } }
                ... on ProjectV2FieldCommon { id name }
              }
            }
            items(first:$items) {
              nodes {
                id
                fieldValues(first:50) {
                  nodes {
                    ... on ProjectV2ItemFieldSingleSelectValue {
                      field { ... on ProjectV2SingleSelectField { name } }
                      name
                    }
                  }
                }
                content {
                  __typename
                  ... on Issue {
                    number state title
                    labels(first:20){ nodes { name } }
                    milestone { title }
                    createdAt closedAt
                  }
                  ... on PullRequest {
                    number state mergedAt createdAt
                  }
                }
              }
            }
          }
        }
      }
    }' | jq '.data.repository.projectsV2.nodes[0]'
}

PJSON=$(read_project)
if [ -z "$PJSON" ] || [ "$PJSON" = "null" ]; then
  echo "# Assistant v1.1 — Weekly Audit"
  echo
  echo "> Project not found: $PROJECT_TITLE"
  exit 0
fi

STATUS_FIELD=$(echo "$PJSON" | jq -r '[.fields.nodes[]|select(.name=="Status")][0]')
ITEMS=$(echo "$PJSON" | jq -c '.items.nodes[]')

# Issues & PRs
ISSUES=$(echo "$ITEMS" | jq -c 'select(.content.__typename=="Issue")')
PRS=$(echo "$ITEMS" | jq -c 'select(.content.__typename=="PullRequest")')

open_issues=$(echo "$ISSUES" | jq 'select(.content.state=="OPEN")' | wc -l | tr -d ' ')
closed_issues=$(echo "$ISSUES" | jq 'select(.content.state!="OPEN")' | wc -l | tr -d ' ')
open_prs=$(echo "$PRS" | jq 'select(.content.state=="OPEN")' | wc -l | tr -d ' ')
merged_prs=$(echo "$PRS" | jq 'select(.content.mergedAt!=null)' | wc -l | tr -d ' ')

theme_count() {
  local key="$1"
  echo "$ISSUES" | jq --arg K "theme: $key" 'select([.content.labels.nodes[].name]|index($K))' | wc -l | tr -d ' '
}

routing_issues=$(theme_count "routing")
citations_issues=$(theme_count "citations")
exports_issues=$(theme_count "exports")
quality_issues=$(theme_count "quality")

# Milestones distribution
milestone_rows=$(echo "$ISSUES" | jq -r '[.content.milestone.title // "Unscheduled"] | @tsv' | sort | uniq -c | awk '{print "| "substr($0, index($0,$2))" | "$1" |"}')

# Project Status distribution
STATUS_MD=""
STATUS_OPTS=$(echo "$STATUS_FIELD" | jq -r '.options[].name' 2>/dev/null || true)
if [ -n "$STATUS_OPTS" ]; then
  while IFS= read -r s; do
    [ -z "$s" ] && continue
    n=$(echo "$ITEMS" | jq -c --arg S "$s" 'select([.fieldValues.nodes[]? | select(.name==$S)] | length > 0)')
    n=$(echo "$n" | wc -l | tr -d ' ')
    STATUS_MD="$STATUS_MD| $s | $n |\n"
  done <<< "$STATUS_OPTS"
fi

echo "# Assistant v1.1 — Weekly Audit"
echo
echo "- Generated: $(date -u +"%Y-%m-%d %H:%M UTC")"
echo "- Repo: \`$OWNER/$REPO\` • Project: **$PROJECT_TITLE**"
echo
echo "## Summary"
echo "- Issues: open **$open_issues**, closed **$closed_issues**"
echo "- PRs: open **$open_prs**, merged **$merged_prs**"
echo
echo "## By Theme (issues)"
echo "| Theme | Count |"
echo "|---|---:|"
echo "| routing | $routing_issues |"
echo "| citations | $citations_issues |"
echo "| exports | $exports_issues |"
echo "| quality | $quality_issues |"
echo
echo "## By Project Status"
if [ -n "$STATUS_MD" ]; then
  echo "| Status | Items |"
  echo "|---|---:|"
  printf "%b" "$STATUS_MD"
else
  echo "_Status field not found or no items._"
fi
echo
echo "## By Milestone (issues)"
if [ -n "$milestone_rows" ]; then
  echo "| Milestone | Issues |"
  echo "|---|---:|"
  echo "$milestone_rows"
else
  echo "_No milestones yet._"
fi
echo
echo "## Notes"
echo "- Counts are based on items currently in the **$PROJECT_TITLE** project."
echo "- Theme counts include any issue labeled \`release: v1.1\` + \`theme: …\`."

echo
echo "## At Risk"
# Criteria: OPEN > 10 days OR milestone due date past
TMP_MS=$(mktemp)
gh api "repos/$OWNER/$REPO/milestones" > "$TMP_MS" || true

now_s=$(date -u +%s)
ten_days=$((10*24*3600))
cutoff=$((now_s - ten_days))

TMP_JSON=$(mktemp)
echo "$ISSUES" | jq -c 'select(.content.state=="OPEN")' | while read -r row; do
  num=$(jq -r '.content.number' <<<"$row")
  ttl=$(jq -r '.content.title // "(no title)"' <<<"$row")
  created=$(jq -r '.content.createdAt' <<<"$row")
  ms_title=$(jq -r '.content.milestone.title // ""' <<<"$row")

  created_s=$(date -u -d "$created" +%s 2>/dev/null || echo 0)
  age_d=$(( (now_s - created_s) / 86400 ))

  past_days=0; due_human=""
  if [ -n "$ms_title" ]; then
    due=$(jq -r --arg T "$ms_title" '.[]|select(.title==$T)|.due_on' "$TMP_MS" 2>/dev/null || echo null)
    if [ "$due" != "null" ] && [ -n "$due" ]; then
      due_s=$(date -u -d "$due" +%s 2>/dev/null || echo 0)
      if [ $now_s -gt $due_s ]; then past_days=$(( (now_s - due_s) / 86400 )); fi
      due_human=$(date -u -d "$due" +%Y-%m-%d 2>/dev/null || echo "$due")
    fi
  fi

  old=$([ $created_s -le $cutoff ] && echo 1 || echo 0)
  if [ "$old" -eq 1 ] || [ "$past_days" -gt 0 ]; then
    url="https://github.com/$OWNER/$REPO/issues/$num"
    printf '{"num":%s,"title":%s,"url":%s,"age":%s,"due":%s,"past":%s}
'       "$num"       "$(jq -Rsa . <<<"$ttl")"       "$(jq -Rsa . <<<"$url")"       "$age_d"       "$(jq -Rsa . <<<"$due_human")"       "$past_days" >> "$TMP_JSON"
  fi
done

rm -f "$TMP_MS" || true

if [ -s "$TMP_JSON" ]; then
  echo "| Issue | Age (days) | Milestone Due | Past Due (days) |"
  echo "|---|---:|---:|---:|"
  jq -s 'sort_by(.past, .age) | reverse | .[:20]' "$TMP_JSON" | jq -r '.[] | "| [#\(.num)](\(.url)) | \(.age) | \(.due) | \(.past) |"'
  echo
  echo "_Showing up to 20 items. See project board for full list._"
else
  echo "_No at-risk items today._"
fi
rm -f "$TMP_JSON" || true
