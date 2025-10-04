# MASTER PROMPT: Create & Fully Populate All Featured GitHub Project Templates (End‑to‑End)

> Use this prompt to instruct an AI assistant or automation agent (e.g., a GitHub App, GitHub Copilot Chat, or an external orchestrator) to **create and fully populate** every GitHub Featured Project template listed below, with opinionated best‑practice defaults, realistic sample data, automations, and reporting. Treat missing values as TODOs and proceed with robust, sensible defaults.

---
## Objectives
1) **Create** eight Projects in GitHub (Projects Beta) using the **Featured** templates:
   - Team planning
   - Kanban
   - Feature release
   - Bug tracker
   - Iterative development
   - Product launch
   - Roadmap
   - Team retrospective
2) **Fully populate** each Project with:
   - Columns/fields, saved views, filters, swimlanes
   - Workflows & automations (issue/pr sync, state transitions, labeling, iteration assignment)
   - Sample items (issues, PRs, draft items) illustrating real usage
   - Dashboards: charts (burnup/burndown, throughput, cycle/lead time, WIP), tables, insights
   - Documentation/README, contribution guidelines, and Definition of Ready/Done where relevant
3) **Connect** Projects across repos/teams, set permissions, and wire up iteration calendars.
4) **Generate artifacts** (YAML/JSON/Markdown) so the setup is reproducible and auditable.

---
## Inputs (fill or use defaults)
- **Org**: `<ORG_NAME>`
- **Repositories** (comma‑sep): `<REPO_LIST>` (e.g., `web, api, mobile, infra`)
- **Teams**: `<TEAMS>` (e.g., `frontend, backend, mobile, devops, qa, product`)
- **Time zone**: `<TZ>` (default: `America/Chicago`)
- **Iteration length**: `<ITERATION_LENGTH>` (default: 2 weeks, starts next Monday)
- **Release cadence**: `<RELEASE_CADENCE>` (default: monthly)
- **Work in progress (WIP) limits**: `<WIP_LIMITS>` (defaults per board below)
- **Issue labels taxonomy**: `<LABELS>` (defaults provided)
- **Compliance requirements**: `<COMPLIANCE>` (e.g., SOC2 logging of changes)

If an input is missing, **choose a reasonable default and continue**.

---
## Global Conventions
- **Labels**: `type:{feature,bug,chore,spike,docs}`, `priority:{p0,p1,p2}`, `area:{web,api,mobile,infra}`, `status:{triage,ready,in-progress,blocked,review,done}`, `release:{yyyy.mm}`.
- **Project custom fields** (create once and reuse): `Status` (single‑select), `Priority`, `Area`, `Estimate` (number, story points), `Cycle time (auto)`, `Lead time (auto)`, `Risk` (enum: low/med/high), `Target Release` (text), `OKR` (text), `Owner` (assignee), `Due` (date), `Iteration` (iteration), `Blocked by` (text), `Env` (enum: dev/stage/prod).
- **Definitions**:
  - **DoR** (Definition of Ready): has acceptance criteria, estimate, linked design/spec, test notes, no blocking dependencies.
  - **DoD** (Definition of Done): merged to default branch, tests pass, docs updated, release notes added, monitoring added if applicable.
- **Automations** (global patterns):
  - New issue with `type:bug` auto‑routes to **Bug tracker**; `type:feature` to **Feature release**; `type:docs` to **Kanban**.
  - Merge PR with label `release:*` updates **Feature release** progress and **Roadmap** percent complete.
  - Closing a milestone updates **Product launch** and **Roadmap**.
- **Artifacts to generate**:
  - `.github/ISSUE_TEMPLATE/*.yml` (bug, feature, task)
  - `.github/PULL_REQUEST_TEMPLATE.md`
  - `.github/workflows/project-sync.yml` (uses GitHub CLI/GraphQL to sync items & fields)
  - `projects/seed/*.json` (Projects schema, views, fields)
  - `docs/projects/*.md` (how‑to, DoR/DoD, working agreements)

---
## Project‑by‑Project Specifications

### 1) Team planning — Project name: `Team Planning — <Quarter>`
**Purpose:** Manage team work items, plan cycles, understand capacity.
**Defaults:** Iterations = 2 weeks; WIP per person = 3; Capacity taken from `Estimate` and `Availability` field.
**Fields:** `Status, Priority, Area, Estimate, Owner, Iteration, Due, Risk, OKR`.
**Views:**
- *Sprint Board* (board by `Status`, swimlane by `Team`), filter `Iteration = current`.
- *Capacity Plan* (table) grouping by `Owner`, sum `Estimate`, conditional formatting when > capacity.
- *Risks* (table) filter `Risk in (med,high)`.
**Automations:**
- When `Iteration` changes to current → set `Status=ready` if DoR met.
- When PR merged linked to item → set `Status=review` → if checks pass → `done`.
- SLA reminder: if `Due` within 3 days and `Status != review|done` → comment and @Owner.
**Sample Data:** Create 25 items across repos, with realistic estimates and OKR links.
**Docs:** Add `docs/projects/team-planning.md` with ceremonies, standup template, and capacity math.

### 2) Kanban — Project name: `Kanban — Platform`
**Purpose:** Visualize flow & limit WIP.
**Columns:** `Triage (WIP ∞)`, `Ready (WIP 10)`, `In Progress (WIP 8)`, `Review (WIP 6)`, `Blocked (no WIP)`, `Done`.
**Policies:** Blocked requires `Blocked by` text; items can’t move to `Review` without linked PR.
**Views:** *Flow Board*, *Throughput (last 4 weeks)* chart, *Cycle Time* chart.
**Automations:** Move to `Blocked` when label `blocked` added; auto‑ping every 48h.
**Sample Data:** 30 items spanning `type:{feature,bug,chore}` with varied `Area`.
**Docs:** `docs/projects/kanban.md` with WIP policies & SLA.

### 3) Feature release — Project name: `Feature Release — <Feature Name>`
**Purpose:** Plan and track a feature release end‑to‑end.
**Phases (field `Phase`):** `Discovery, Design, Build, Test, Beta, GA`.
**Milestones:** create repo milestones for each phase; link.
**Views:** Roadmap timeline by `Phase` and `Due`; *Release Checklist* table (DoD indicators); *QA Matrix*.
**Automations:**
- Merge to default branch with label `release:<yyyy.mm>` increments progress; when GA threshold 100% → create Release notes draft.
- Beta issues auto‑assign to `qa` team; failing checks reopen item.
**Sample Data:** 15 feature stories, 10 sub‑tasks, 5 bugs, 1 epic with dependencies.
**Docs:** `docs/projects/feature-release.md` with template release notes.

### 4) Bug tracker — Project name: `Bug Tracker — All Products`
**Purpose:** Track, triage, and resolve defects.
**Fields:** `Severity (S0—S3)`, `Impact (users)`, `Env`, `Area`, `Owner`, `Status`, `Estimate`, `Due`.
**Views:** *Intake (new/triage)*, *SLA Breaches* (Due < today & not done), *Hotlist* (S0/S1), *Defect Trends* (chart by week).
**Automations:**
- New issue with `type:bug` → add to project; AI triage suggests `Severity` and `Area` based on template content.
- When `Severity=S0` → page `oncall` via webhook; auto‑create `fix‑followup` task on close.
**Sample Data:** Seed 40 bugs with realistic templates & repro steps; 5 linked PRs.
**Docs:** `ISSUE_TEMPLATE/bug.yml` with required fields.

### 5) Iterative development — Project name: `Iterations — <Program>`
**Purpose:** Plan current & upcoming iterations while working through prioritized backlog.
**Setup:** Create rolling **Iterations** (8 cycles), sprint goals, and carryover policy.
**Views:** *Current Sprint* board, *Next Sprint* table (auto‑pull top backlog by priority until capacity), *Burndown* chart.
**Automations:**
- End of sprint → move incomplete items to `Next Sprint` and comment with reason (`blocked`, `under‑estimated`, `scope change`).
- On item entering sprint without `Estimate` → block with comment & add `needs‑estimate`.
**Sample Data:** 50 backlog items with priorities and estimates; 2 sprints worth assigned.
**Docs:** `docs/projects/iterations.md` (ceremonies, roles, capacity calc).

### 6) Product launch — Project name: `Launch — <Product Name> v<Version>`
**Purpose:** Cross‑functional planning across Eng, PM, Design, Marketing, Sales, Support, Legal.
**Tracks (field `Track`)**: `Eng, PM, Design, Docs, Marketing, Sales, Support, Legal, Data`.
**Views:** *Gantt* (timeline by `Track`), *Go/No‑Go checklist*, *Launch Comms Matrix*, *Post‑launch watch* (telemetry tasks).
**Automations:**
- Hitting GA date creates `post‑launch` tasks (telemetry, oncall runbook, marketing follow‑ups).
- If critical bug filed in 7 days post‑launch → open `hotfix` epic and gate comms.
**Sample Data:** 35 tasks across tracks, comms calendar, asset checklist.
**Docs:** `docs/projects/product-launch.md` + PRD link placeholder.

### 7) Roadmap — Project name: `Roadmap — <FY>`
**Purpose:** Long‑term planning.
**Fields:** `Horizon (Now/Next/Later)`, `Confidence (low/med/high)`, `T‑shirt Size (S/M/L/XL)`, `Strategic Pillar`.
**Views:** *Now/Next/Later* board, *Quarterly Timeline*, *Pillar Heatmap* (chart), *Risks & Bets* table.
**Automations:**
- When item enters `Now` with `Confidence>=med` → create corresponding epic in `Feature release` and link.
- Portfolio roll‑up percent complete based on linked issues.
**Sample Data:** 20 roadmap items with links to epics and success metrics.
**Docs:** `docs/projects/roadmap.md` + governance.

### 8) Team retrospective — Project name: `Retro — Sprint <N>`
**Purpose:** Reflect on outcomes, decide actions.
**Sections (labels):** `kudos`, `went‑well`, `to‑improve`, `ideas`, `actions`.
**Views:** *Retro Board* (by section), *Action Items* table with owners & due dates, *Trend of Themes* chart across sprints.
**Automations:**
- When `actions` item created → auto‑add to **Iterations** project next sprint.
- After 30 days → check if `actions` are done; if not, escalate to team lead.
**Sample Data:** Seed with 15 retro notes and 5 action items.
**Docs:** `docs/projects/retro.md` (working agreements, psychological safety statement).

---
## Reproducible Setup (required output)
Produce the following **deliverables** to standard output and also write them into the repo structure:
1) **Project Schemas** (`projects/seed/*.json`): GraphQL/CLI JSON for each project—fields, views, filters, iterations, and automations.
2) **GitHub CLI Scripts** (`scripts/projects/*.sh`): idempotent scripts to create/update projects, fields, and saved views.
3) **Workflow** (`.github/workflows/project-sync.yml`):
   - Triggers: `issues`, `pull_request`, `project_item`, `schedule: nightly`.
   - Actions: sync fields, push WIP limits, auto‑move by status, label hygiene, SLA pings.
4) **Issue Templates** (`.github/ISSUE_TEMPLATE/*.yml`) for `bug`, `feature_request`, `task`, with required metadata mapping to fields.
5) **PR Template** (checklist aligned to DoD).
6) **Docs** under `docs/projects/` for each project with usage guides and screenshots placeholders.
7) **Dashboards**: JSON definitions for charts if using GitHub Insights or external dashboards (e.g., CSV export to `analytics/`).

---
## Acceptance Criteria (global)
- All eight Projects exist and are accessible to teams with least‑privilege permissions.
- Each Project has ≥3 saved views, ≥1 chart, and ≥15 realistic seeded items (except Roadmap ≥20).
- Automations function: item state transitions, SLA reminders, iteration rollovers, cross‑project linking.
- WIP violations are clearly surfaced and documented.
- README in `docs/projects/INDEX.md` links to each project and explains how to maintain.

---
## Example Command Hints (assistant should generate concretely)
- Use `gh project create`, `gh project field-create`, `gh project item-add`, `gh project view-create`.
- Use GraphQL mutations for advanced fields (Iteration, Single‑select, Formulas).
- Provide a `make projects-seed` target to run everything locally/CI.

---
## Safety, Audit, & Rollback
- All scripts are **idempotent**; re‑running updates diffs.
- Log every change as a PR with codeowners review.
- Include a `scripts/projects/destroy.sh` gated by `CONFIRM=YES`.

---
## Final Instruction to the Assistant
Proceed now:
1) Resolve any placeholders with sensible defaults if not provided.
2) Emit all artifacts (scripts, JSON, YAML, Markdown) inline and as files.
3) Execute creation steps (if you have permissions); otherwise output a **copy‑paste‑ready** bundle of scripts and files.
4) Conclude with a summary table of created Projects, URLs, and initial item counts.

