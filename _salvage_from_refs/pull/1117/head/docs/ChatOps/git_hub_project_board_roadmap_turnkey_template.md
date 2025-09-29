# ⚙️ One-Command Project Board + Roadmap (Template)

> Plug in your org/repo names below, then copy-paste commands. This sets up a GitHub Project (v2), adds all existing issues, turns on auto‑ingest for new issues/PRs, and gives you a ready-to-run roadmap layout and views.

---

## 0) Fill in your variables

```bash
# Who owns the Project (org or user)
OWNER="acme-inc"          # e.g., your GitHub org

# New Project title
PROJECT_TITLE="Engineering Roadmap 2025"

# Repositories to ingest into the Project
REPOS=(
  "webapp"
  "mobile"
  "platform"
)

# (Optional) Only add issues with these labels when bulk importing
# Leave empty to import everything
IMPORT_LABELS=("backend" "frontend" "feature")

# If you’ll use the Actions workflow below, create a fine‑grained PAT
# with: Organization permissions → Projects: Read & Write;
# and repo-level read for issues/PRs. Store as secret ADD_TO_PROJECT_PAT.
PROJECT_PAT_SECRET_NAME="ADD_TO_PROJECT_PAT"
```

---

## 1) Create the GitHub Project (v2)

```bash
# Create project and grab its number + id
PROJECT_NUMBER=$(gh project create --owner "$OWNER" --title "$PROJECT_TITLE" --format json | jq -r '.number')
PROJECT_ID=$(gh project view "$PROJECT_NUMBER" --owner "$OWNER" --format json | jq -r '.id')
echo "Project created → number=$PROJECT_NUMBER id=$PROJECT_ID"

# (Optional) Link project to repos for convenience
for r in "${REPOS[@]}"; do
  gh project link "$PROJECT_NUMBER" --owner "$OWNER" --repo "$OWNER/$r"
done
```

### Add core fields

> Status (single‑select), Priority (single‑select), Area (single‑select), Start / Target (dates). You can add an Iteration field from the UI later if you want sprints.

```bash
# Status
STATUS_FIELD_JSON=$(gh project field-create "$PROJECT_NUMBER" --owner "$OWNER" \
  --name "Status" --data-type SINGLE_SELECT \
  --single-select-options "Backlog,Ready,In Progress,Blocked,In Review,Done" \
  --format json)
STATUS_FIELD_ID=$(echo "$STATUS_FIELD_JSON" | jq -r '.id')

# Priority
PRIORITY_FIELD_JSON=$(gh project field-create "$PROJECT_NUMBER" --owner "$OWNER" \
  --name "Priority" --data-type SINGLE_SELECT \
  --single-select-options "P0,P1,P2,P3" --format json)
PRIORITY_FIELD_ID=$(echo "$PRIORITY_FIELD_JSON" | jq -r '.id')

# Area / Workstream
AREA_FIELD_JSON=$(gh project field-create "$PROJECT_NUMBER" --owner "$OWNER" \
  --name "Area" --data-type SINGLE_SELECT \
  --single-select-options "Platform,Frontend,Mobile,Data,DevEx,Ops" --format json)
AREA_FIELD_ID=$(echo "$AREA_FIELD_JSON" | jq -r '.id')

# Dates for roadmap layout
START_FIELD_ID=$(gh project field-create "$PROJECT_NUMBER" --owner "$OWNER" \
  --name "Start" --data-type DATE --format json | jq -r '.id')
TARGET_FIELD_ID=$(gh project field-create "$PROJECT_NUMBER" --owner "$OWNER" \
  --name "Target" --data-type DATE --format json | jq -r '.id')

echo "Fields → status=$STATUS_FIELD_ID priority=$PRIORITY_FIELD_ID area=$AREA_FIELD_ID start=$START_FIELD_ID target=$TARGET_FIELD_ID"
```

---

## 2) Bulk‑add **all existing issues** into the Project

> Adds open + closed issues from each repo. Adjust `--state` or `IMPORT_LABELS` as needed.

```bash
for r in "${REPOS[@]}"; do
  echo "Importing issues from $OWNER/$r ..."
  if [ ${#IMPORT_LABELS[@]} -eq 0 ]; then
    gh issue list -R "$OWNER/$r" --state all --json url --limit 1000 \
      | jq -r '.[].url' \
      | xargs -I{} gh project item-add "$PROJECT_NUMBER" --owner "$OWNER" --url {}
  else
    for lbl in "${IMPORT_LABELS[@]}"; do
      gh issue list -R "$OWNER/$r" --state all --label "$lbl" --json url --limit 1000 \
        | jq -r '.[].url' \
        | xargs -I{} gh project item-add "$PROJECT_NUMBER" --owner "$OWNER" --url {}
    done
  fi
  echo "✔ Done: $OWNER/$r"
done
```

> Tip: Projects can hold up to \~50k items total; consider filtering imports by label or date if you have a very large history.

---

## 3) Auto‑ingest **new** issues/PRs

### Option A — Built‑in Project Workflows (no code)

1. Open the Project → **Workflows**.
2. Enable **Auto‑add to project** and set a repo filter like:
   - `repo:acme-inc/webapp,acme-inc/mobile,acme-inc/platform`
   - Optional label filters (e.g., `label:feature OR label:bug`).
3. Optionally enable **Item closed** (set Status → Done) and **Item reopened** (Status → In Progress).

### Option B — GitHub Actions (works across repos)

Create `.github/workflows/add-to-project.yml` in each repo you want to feed the Project.

```yaml
name: Add to Project
on:
  issues:
    types: [opened, reopened, transferred, labeled]
  pull_request:
    types: [opened, reopened, labeled, ready_for_review]

jobs:
  add:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      issues: read
      pull-requests: read
    steps:
      - uses: actions/add-to-project@v1
        with:
          project-url: https://github.com/orgs/${{ vars.ORG_NAME }}/projects/${{ vars.PROJECT_NUMBER }}
          github-token: ${{ secrets.ADD_TO_PROJECT_PAT }}
          # Optional filters
          # labeled: feature, needs-triage
          # label-operator: OR
```

> Org‑level: store `ORG_NAME` and `PROJECT_NUMBER` as org‑level **Actions variables**; store the PAT as a secret named `ADD_TO_PROJECT_PAT` at org or repo level.

---

## 4) Views you should create in the Project

### A) **Backlog (Table)**

Filter: `is:issue -status:Done`\
Fields: Title, Status, Priority, Area, Assignees, Start, Target

### B) **Sprint Board (Board)**

Group by: `Status`\
Filter: `iteration:@current` (if you later add an Iteration field)\
WIP limits: set on `In Progress` and `In Review` columns.

### C) **Roadmap (Timeline)**

Layout: **Roadmap**\
Start date: `Start`\
End date: `Target`\
Filter: `is:issue` (or `label:epic` for only epics)

### D) **Bugs (Table)**

Filter: `label:bug -status:Done`

### E) **Risks & Dependencies (Table)**

Suggested custom fields: `Risk (SINGLE_SELECT: Low/Med/High)`, `Blocked By (TEXT)`, `Owner (TEXT)`

---

## 5) Minimal Roadmap you can paste into the Project (as draft issues)

> Use **Add item → Create draft** for each Epic, then break down into issues.

**Theme: Performance & Reliability**

- **Epic:** Global Caching Layer (Area: Platform, Priority: P0, Target: 2025-10-31)
- **Epic:** Mobile cold‑start < 1.5s (Area: Mobile, P1, Target: 2025-11-15)

**Theme: Developer Experience (DevEx)**

- **Epic:** CI 2.0 (parallelization, flaky test gating) (Area: DevEx, P1, Target: 2025-09-30)
- **Epic:** Unified schema contract tests (Area: Platform, P1, Target: 2025-10-15)

**Theme: Revenue Growth**

- **Epic:** Self‑serve onboarding v2 (Area: Frontend, P0, Target: 2025-12-15)
- **Epic:** Usage‑based billing pilot (Area: Platform, P1, Target: 2026-01-31)

> After adding epics, convert critical ones into repo issues and link child issues with `relates-to`/`blocks` in descriptions. Set **Start**/**Target** for the Roadmap view.

---

## 6) Handy scripts

### A) Set default **Status** for all newly imported items to `Backlog`

```bash
# Discover Status field + option ids
FIELDS_JSON=$(gh project field-list "$PROJECT_NUMBER" --owner "$OWNER" --format json)
STATUS_FIELD_ID=$(echo "$FIELDS_JSON" | jq -r '.[] | select(.name=="Status") | .id')
STATUS_BACKLOG_ID=$(echo "$FIELDS_JSON" | jq -r '.[] | select(.name=="Status") | .options[] | select(.name=="Backlog") | .id')

# Apply to every item that has no Status
ITEM_IDS=$(gh project item-list "$PROJECT_NUMBER" --owner "$OWNER" --format json \
  | jq -r '.items[] | select((.fieldValues[]? | select(.name=="Status")) | not) | .id')

for item in $ITEM_IDS; do
  gh project item-edit \
    --id "$item" \
    --project-id "$PROJECT_ID" \
    --field-id "$STATUS_FIELD_ID" \
    --single-select-option-id "$STATUS_BACKLOG_ID"
done
```

### B) Quick filters you’ll actually use

- **Mine this sprint:** `assignee:@me iteration:@current -status:Done`
- **Ready for dev:** `status:Ready -status:Done`
- **Blocked:** `status:Blocked`
- **October delivery:** `target:2025-10-01..2025-10-31`

---

## 7) Governance (fast but sane)

- Cadence: 2‑week iterations; Mon planning, Fri demo.
- SLAs: P0 ≤ 24h start, P1 ≤ 3d, P2 ≤ 10d.
- Definition of Done: code + tests + docs + monitoring + feature flag strategy.
- Risk triage each retro; anything `Risk: High` must have an owner and mitigations.

---

## 8) Troubleshooting

- **PAT vs GITHUB_TOKEN:** For org Projects, the `actions/add-to-project` workflow requires a PAT (or GitHub App) with Projects write. Store it as a secret.
- **Iteration field:** Add via Project UI if you need sprint buckets; then use `iteration:@current` in filters. You can edit iterations (length, breaks) from the field settings.
- **Hitting limits:** If imports are huge, import only `state:open` and label subsets first.

---

## 9) Clean rollback

- Delete unwanted items: `gh project item-list … | xargs gh project item-delete …`
- Archive completed: enable the built‑in **Auto‑archive** workflow in the Project.

---

**You’re set.** Run steps 1–3 now, then switch to the **Roadmap** view and drag dates. After that, start grooming the Backlog and setting Status/Priority for the top 20 items.
