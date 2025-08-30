#!/usr/bin/env bash
set -euo pipefail

OWNER_REPO=$(git remote get-url origin | sed -E 's#.*[:/](.*)/(.*)\.git#\1/\2#')
OWNER=${OWNER_REPO%/*}
REPO=${OWNER_REPO#*/}

command -v gh >/dev/null || { echo "Install GitHub CLI (gh)"; exit 1; }

echo "==> Creating labels"
if [ -f .github/labels.yml ]; then
  # Requires gh >= 2.37 (gh label import). Fallback: loop.
  if gh label import -f .github/labels.yml 2>/dev/null; then
    :
  else
    while IFS= read -r line; do
      name=$(echo "$line" | sed -n 's/- name: \(.*\)/\1/p');
      [ -z "$name" ] && continue
      color=$(grep -A2 "- name: $name" .github/labels.yml | sed -n 's/  color: \(.*\)/\1/p' | head -1)
      desc=$(grep -A3 "- name: $name" .github/labels.yml | sed -n 's/  description: \(.*\)/\1/p' | head -1)
      gh label create "$name" --color "${color:-ededed}" ${desc:+--description "$desc"} || true
    done < <(grep "- name:" .github/labels.yml)
  fi
fi

echo "==> Creating milestones"
if [ -f .github/milestones.yml ]; then
  while IFS= read -r t; do
    title=$(echo "$t" | sed -n 's/- title: \(.*\)/\1/p')
    [ -z "$title" ] && continue
    desc=$(grep -A2 "- title: $title" .github/milestones.yml | sed -n 's/  description: \(.*\)/\1/p' | head -1)
    gh api \
      -X POST \
      repos/$OWNER/$REPO/milestones \
      -f title="$title" \
      -f description="$desc" || true
  done < <(grep "- title:" .github/milestones.yml)
fi

PROJECT_TITLE="${PROJECT_TITLE:-Assistant v1.1}"
echo "==> Creating project: $PROJECT_TITLE"
PROJECT_ID=$(gh project list --owner "$OWNER" --format json | jq -r \
  ".[] | select(.title==\"$PROJECT_TITLE\").id" | head -1 || true)

if [ -z "$PROJECT_ID" ] || [ "$PROJECT_ID" = "null" ]; then
  PROJECT_ID=$(gh project create "$PROJECT_TITLE" --owner "$OWNER" --format json | jq -r '.id')
fi
echo "Project ID: $PROJECT_ID"

echo "==> Creating tracking issues"
create_issue() {
  local title=$1; shift
  local body_file=$1; shift
  local labels=$1; shift
  local milestone=$1; shift
  local issue_url
  issue_url=$(gh issue create --title "$title" --body-file "$body_file" --label "$labels" --milestone "$milestone" --repo "$OWNER/$REPO" --json url | jq -r .url)
  echo "Created: $issue_url"
  if [ -n "$PROJECT_ID" ] && [ "$PROJECT_ID" != "null" ]; then
    gh project item-add "$PROJECT_ID" --url "$issue_url" >/dev/null || true
  fi
}

create_issue "Assistant v1.1: Routing UI / Policy" \
  .github/ISSUE_TEMPLATE/assistant-v1.1-routing-ui.md \
  "release: v1.1,theme: routing,tracking" "Assistant v1.1"

create_issue "Assistant v1.1: Inline Citation Highlighting" \
  .github/ISSUE_TEMPLATE/assistant-v1.1-inline-citations.md \
  "release: v1.1,theme: citations,tracking" "Assistant v1.1"

create_issue "Assistant v1.1: Export Playbooks" \
  .github/ISSUE_TEMPLATE/assistant-v1.1-export-playbooks.md \
  "release: v1.1,theme: exports,tracking" "Assistant v1.1"

create_issue "Assistant v1.1: Quality Hardening" \
  .github/ISSUE_TEMPLATE/assistant-v1.1-quality-hardening.md \
  "release: v1.1,theme: quality,tracking" "Assistant v1.1"

echo "✅ Roadmap bootstrap complete"

# --- helpers ---------------------------------------------------------------
need() { command -v "$1" >/dev/null || { echo "missing $1"; exit 1; }; }
need gh; need jq

# Optional fixed calendar overrides
read_calendar() {
  if [ -f ".github/roadmap_calendar.yml" ] && command -v ${YQ_CMD:-yq} >/dev/null; then
    local yq=${YQ_CMD:-yq}
    CAL_START=$($yq '.v1_1.start // ""' .github/roadmap_calendar.yml)
    CAL_W12=$($yq '.v1_1.w12_due // ""' .github/roadmap_calendar.yml)
    CAL_W34=$($yq '.v1_1.w34_due // ""' .github/roadmap_calendar.yml)
    CAL_W5=$($yq '.v1_1.w5_due // ""'  .github/roadmap_calendar.yml)
    CAL_W6=$($yq '.v1_1.w6_due // ""'  .github/roadmap_calendar.yml)
  else
    CAL_START=""; CAL_W12=""; CAL_W34=""; CAL_W5=""; CAL_W6="";
  fi
}
read_calendar

# POSIX-ish date add (GNU date preferred; macOS: brew install coreutils -> gdate)
dadd() {
  if command -v gdate >/dev/null; then gdate -u -d "$1 $2 days" +"%Y-%m-%d"
  else date -u -d "$1 $2 days" +"%Y-%m-%d" 2>/dev/null || python3 - <<PY
import sys,datetime as d
start=sys.argv[1]; days=int(sys.argv[2])
s=d.datetime.strptime(start,"%Y-%m-%d")
print((s+d.timedelta(days=days)).strftime("%Y-%m-%d"))
PY
  fi
}

repo_json() { gh repo view --json owner,name; }
OWNER=$(repo_json | jq -r .owner.login)
REPO=$(repo_json | jq -r .name)

ensure_milestone() {
  local title="$1" due="$2"
  local mid
  mid=$(gh api "repos/$OWNER/$REPO/milestones" --jq \
    ".[]|select(.title==\"$title\")|.number") || true
  if [ -z "$mid" ]; then
    mid=$(gh api -X POST "repos/$OWNER/$REPO/milestones" \
      -f title="$title" -f due_on="${due}T00:00:00Z" --jq .number)
    echo "created milestone: $title (#$mid)"
  else
    echo "milestone exists: $title (#$mid)"
  fi
  echo "$mid"
}

read_assignees() {
  local key="$1"
  if [ -n "${ROUTING_ASSIGNEES:-}" ] && [ "$key" = "routing" ]; then echo "$ROUTING_ASSIGNEES"; return; fi
  if [ -n "${CITATIONS_ASSIGNEES:-}" ] && [ "$key" = "citations" ]; then echo "$CITATIONS_ASSIGNEES"; return; fi
  if [ -n "${EXPORTS_ASSIGNEES:-}" ] && [ "$key" = "exports" ]; then echo "$EXPORTS_ASSIGNEES"; return; fi
  if [ -n "${QUALITY_ASSIGNEES:-}" ] && [ "$key" = "quality" ]; then echo "$QUALITY_ASSIGNEES"; return; fi
  if [ -f ".github/assignees.yml" ]; then
    yq_cmd=${YQ_CMD:-yq}
    if command -v $yq_cmd >/dev/null; then
      $yq_cmd -o=json ".${key} // .default // []" ".github/assignees.yml" | jq -r '.[]' | paste -sd, -
      return
    fi
  fi
  echo ""
}

project_id_by_title() {
  local title="$1"
  gh api graphql -f query='
    query($owner:String!,$repo:String!,$title:String!) {
      repository(owner:$owner,name:$repo){
        projectsV2(first:20, query:$title){ nodes { id title }
        }
      }
    }' -F owner="$OWNER" -F repo="$REPO" -F title="$title" \
  | jq -r '.data.repository.projectsV2.nodes[] | select(.title==$title) | .id'
}

project_status_field() {
  local pid="$1" want="${2:-Backlog}"
  gh api graphql -f query='
    query($id:ID!){
      node(id:$id){
        ... on ProjectV2 {
          fields(first:50){
            nodes {
              ... on ProjectV2FieldCommon { id name }
              ... on ProjectV2SingleSelectField { id name options { id name } }
            }
          }
        }
      }
    }' -F id="$pid" | jq -r --arg WANT "$want" '
      .data.node.fields.nodes
      | map(select(.name=="Status"))[0]
      | .id as $fid
      | (.options // []) | map(select(.name==$WANT))[0].id as $oid
      | "\($fid),\($oid)"'
}

set_project_status() {
  local pid="$1" itemId="$2" status="${3:-Backlog}"
  local ids; ids=$(project_status_field "$pid" "$status") || return 0
  local fid="${ids%,*}" oid="${ids#*,}"
  [ -z "$fid" ] || [ -z "$oid" ] && return 0
  gh api graphql -f query='
    mutation($project:ID!, $item:ID!, $field:ID!, $option: String!){
      setProjectV2ItemFieldValue(input:{
        projectId:$project,
        itemId:$item,
        fieldId:$field,
        value:{ singleSelectOptionId: $option }
      }) { clientMutationId }
    }' -F project="$pid" -F item="$itemId" -F field="$fid" -F option="$oid" >/dev/null || true
}

ensure_added_to_project_and_set_status() {
  local issue_node="$1" pid="$2"
  local add_json
  add_json=$(gh api graphql -f query='
    mutation($project:ID!,$issue:ID!){
      addProjectV2ItemById(input:{projectId:$project, contentId:$issue}){ item { id } }
    }' -F project="$pid" -F issue="$issue_node" || true)
  local item_id
  item_id=$(echo "$add_json" | jq -r '.data.addProjectV2ItemById.item.id // empty')
  if [ -z "$item_id" ]; then
    item_id=$(gh api graphql -f query='
      query($project:ID!,$issue:ID!){
        node(id:$project){
          ... on ProjectV2{ items(first:50){ nodes{ id content{ ... on Issue { id } } } } }
        }
      }' -F project="$pid" -F issue="$issue_node" | jq -r '.data.node.items.nodes[] | select(.content.id=="'$issue_node'") | .id' | head -1)
  fi
  # Set explicit status if available (default Backlog, override via DEFAULT_STATUS)
  if [ -n "$item_id" ]; then
    set_project_status "$pid" "$item_id" "${DEFAULT_STATUS:-Backlog}"
  fi
}

issue_node_id() {
  local num="$1"
  gh api "repos/$OWNER/$REPO/issues/$num" --jq .node_id
}

set_issue_milestone() {
  local num="$1" mid="$2"
  gh issue edit "$num" --milestone "$mid" >/dev/null
}

assign_issue() {
  local num="$1" csv="$2"
  [ -z "$csv" ] && return 0
  IFS=',' read -r -a arr <<< "$csv"
  gh issue edit "$num" --add-assignee "${arr[@]}" >/dev/null || true
}

# --- v1.1 auto split -------------------------------------------------------
auto_split_v11() {
  local project="${PROJECT_TITLE:-Assistant v1.1}"

  # Prefer fixed calendar if provided, else compute from next Monday or START_YYYYMMDD
  local start
  if [ -n "${CAL_START:-}" ]; then
    start="$CAL_START"
  elif [ -n "${START_YYYYMMDD:-}" ]; then
    start="${START_YYYYMMDD:0:4}-${START_YYYYMMDD:4:2}-${START_YYYYMMDD:6:2}"
  else
    if command -v gdate >/dev/null; then start=$(gdate -u -d "next monday" +"%Y-%m-%d")
    else start=$(date -u -d "next monday" +"%Y-%m-%d" 2>/dev/null || echo "$(date -u +%Y-%m-%d)"); fi
  fi

  local due_w12 due_w34 due_w5 due_w6
  if [ -n "${CAL_W12:-}" ]; then due_w12="$CAL_W12"; else due_w12=$(dadd "$start" 14); fi
  if [ -n "${CAL_W34:-}" ]; then due_w34="$CAL_W34"; else due_w34=$(dadd "$start" 28); fi
  if [ -n "${CAL_W5:-}"  ]; then due_w5="$CAL_W5";   else due_w5=$(dadd "$start" 35); fi
  if [ -n "${CAL_W6:-}"  ]; then due_w6="$CAL_W6";   else due_w6=$(dadd "$start" 42); fi

  local m12 m34 m5 m6
  m12=$(ensure_milestone "Assistant v1.1 — W1–2" "$due_w12")
  m34=$(ensure_milestone "Assistant v1.1 — W3–4" "$due_w34")
  m5=$(ensure_milestone "Assistant v1.1 — W5" "$due_w5")
  m6=$(ensure_milestone "Assistant v1.1 — W6" "$due_w6")

  local pid
  pid=$(project_id_by_title "$project")
  if [ -z "$pid" ]; then echo "Project not found: $project"; exit 1; fi

  # Optional theme→week mapping via config
  read_mapping() {
    if [ -f ".github/roadmap_mapping.yml" ] && command -v ${YQ_CMD:-yq} >/dev/null; then
      local yq=${YQ_CMD:-yq}
      MAP_ROUTING=$($yq -r '.v1_1.routing' .github/roadmap_mapping.yml)
      MAP_CITATIONS=$($yq -r '.v1_1.citations' .github/roadmap_mapping.yml)
      MAP_EXPORTS=$($yq -r '.v1_1.exports' .github/roadmap_mapping.yml)
      MAP_QUALITY=$($yq -r '.v1_1.quality' .github/roadmap_mapping.yml)
    fi
  }
  read_mapping
  mid_by_title() { gh api "repos/$OWNER/$REPO/milestones" --jq ".[]|select(.title==\"$1\")|.number"; }
  resolve_mid_for_theme() {
    case "$1" in
      routing)   [ -n "${MAP_ROUTING:-}" ]   && mid_by_title "$MAP_ROUTING"   || echo "$m12" ;;
      citations) [ -n "${MAP_CITATIONS:-}" ] && mid_by_title "$MAP_CITATIONS" || echo "$m12" ;;
      exports)   [ -n "${MAP_EXPORTS:-}" ]   && mid_by_title "$MAP_EXPORTS"   || echo "$m34" ;;
      *)         [ -n "${MAP_QUALITY:-}" ]   && mid_by_title "$MAP_QUALITY"   || echo "$m5"  ;;
    esac
  }

  # fetch issues labeled release: v1.1 and classify by title
  gh issue list --label "release: v1.1" --limit 100 --json number,title,labels | \
  jq -c '.[]' | while read -r row; do
    num=$(jq -r .number <<<"$row")
    title=$(jq -r .title <<<"$row")
    key="quality"
    if   grep -qi "routing"   <<<"$title"; then key="routing"
    elif grep -qi "citation"  <<<"$title"; then key="citations"
    elif grep -qi "export"    <<<"$title"; then key="exports"; fi

    mid=$(resolve_mid_for_theme "$key")
    set_issue_milestone "$num" "$mid"
    assign_issue "$num" "$(read_assignees "$key")"
    inid=$(issue_node_id "$num")
    ensure_added_to_project_and_set_status "$inid" "$pid"
    echo "✓ Issue #$num → $key"
  done
}

# --- call when title matches v1.1 -----------------------------------------
if [[ "${PROJECT_TITLE:-Assistant v1.1}" == "Assistant v1.1" ]]; then
  auto_split_v11
fi
