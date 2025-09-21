# GA Core — 3–4 Day PR & Branch Action Plan (Aug 20–23, 2025)

**Decisions confirmed:**

- ✅ Make the **CI‑rescue PR** the **only required check** temporarily (**plus `policy-ci`**) until GA.
- ✅ Defer **heavy ML Python installs** in CI unless PR title is tagged **`[ml]`**.
- ✅ Split **#709** into **5 PRs**: `chore/ci-baseline`, `server/core`, `client/shell`, `db/migrations`, `governance/opa`.

---

## 0) Repo Settings — Required Checks (temporary)

**Goal:** Only two required status checks on `main`: `ci` and `policy-ci`.

**Using `gh` CLI (copy/paste):**

```bash
# Authenticate first: gh auth login
# Replace ORG/REPO if needed
OWNER=BrianCLong
REPO=intelgraph
BRANCH=main

# Read current ruleset
gh api repos/$OWNER/$REPO/branches/$BRANCH/protection > .tmp.protection.json

# Apply minimal required checks
jq '.required_status_checks.checks=[{"context":"ci"},{"context":"policy-ci"}] | .required_status_checks.strict=false' \
  .tmp.protection.json > .tmp.protection.min.json

gh api -X PUT repos/$OWNER/$REPO/branches/$BRANCH/protection \
  -H "Accept: application/vnd.github+json" \
  -F required_status_checks@.tmp.protection.min.json \
  -F enforce_admins=true -F restrictions= \
  -F required_linear_history=true -F allow_force_pushes=false -F allow_deletions=false
```

> If rulesets are used instead of classic protection, mirror the same two required checks in the active ruleset.

---

## 1) CI‑Rescue PR — Open & Land First

**Branch/PR:** `hotfix/ci-ga-core-aug20`

**Patchset (already drafted in “CI Rescue Plan & Patchset”):**

- `.graphqlrc.yml` → point to `server/src/**` schema + `client/src/graphql/**` docs
- `package.json` → `graphql:schema:check` uses `graphql-inspector validate`
- `.github/workflows/ci.yml` → **light Python** (`ruff` only); add optional ML deps when PR title contains `[ml]`
- `.github/workflows/policy-ci.yml` → use `instrumenta/conftest-action`
- Ensure Playwright browsers install **only** in `e2e.yml`

**After merge:** Rebase **#709**, **#712**, **#717**; ensure only `ci` and `policy-ci` are required.

---

## 2) Split & Rebase Plan for #709 (Foundation)

Create 5 PRs from the #709 branch (path‑scoped diffs):

1. `chore/ci-baseline` — CI fixes & root scaffolding
2. `server/core` — GraphQL server, schema, resolvers, services
3. `client/shell` — tri‑pane app shell, routing, GraphQL provider
4. `db/migrations` — Postgres/Neo4j migrations & seeds
5. `governance/opa` — middleware, policy stubs, tests

**Procedure:**

```bash
gh pr checkout 709
# 1) chore/ci-baseline
git switch -c split/chore-ci-baseline
git add .graphqlrc.yml package.json .github/workflows/**
git commit -m "chore(ci): baseline pipeline reliability"
git push -u origin split/chore-ci-baseline
gh pr create -B main -t "chore(ci): baseline pipeline reliability" -b "Extracted from #709"

# 2) server/core (example pathspec)
git switch -c split/server-core
git restore -SW :/  # clean pathspec selection
git add server/ src/server/ server/src/**
git commit -m "server(core): graphql/api core extracted from #709"
# ... repeat for the remaining slices
```

---

## 3) PR‑Specific Unblocks (High Priority)

### #712 — Copilot NL→Cypher

- Rebase on `main` after CI‑rescue
- Add pre‑test step in CI: `npm run persist:queries` (or the repo’s script) so TS types are generated
- Mock network (`socket.io-client`, GraphQL) in unit tests so no live calls
- Keep **preview‑only** execution and assert it in tests

### #717 — GA Core Release (meta)

- Rebase on `main` after CI‑rescue; ensure only `ci` + `policy-ci` are required
- Convert any optional jobs to `continue-on-error: true` until GA lock

### #709 — Foundation (monolith)

- Execute the 5‑way split above; close the umbrella PR when all slices are merged

---

## 4) Today’s Queue — PRs Opened/Updated in the Last 3–4 Days

_(Actioned in this order; assign owners in Issue #714)_

**A. Release / Epics scaffolding**

- **#724 `feat(authz-gateway)`** — Node AuthN/Z proxy with OPA → _Merge after CI green_; label `F:governance`
- **#723 `Release/ga-core-2025-08-20`** — Release cut → _Keep open_, fast‑forward from epics post‑CI
- **#722 `Epic/graph-core-B`**, **#721 `Epic/ingest-core-A`**, **#720 `Epic/governance-min-F`**, **#719 `Epic/copilot-core-D`**, **#718 `Epic/analytics-core-C`** → _Merge to `release/ga-core` only after CI‑rescue_; attach Milestone GA Core
- **#717 `GA Core Release`** → _Meta_; depends on #709 split + #712 readiness

**B. Copilot & NL→Cypher**

- **#712 `feat(copilot): NL→Cypher preview`** → fix types/persisted ops; preview‑only; merge once green
- **#704 `add copilot NLQ to Cypher pipeline`** → _Fold into #712_ (cherry‑pick tests)

**C. Foundation & Platform**

- **#709 `GA Foundation`** → _Split into 5 PRs_ (this plan); close umbrella after slices merge
- **#710 `tenant and quota services`** → _Rebase after `server/core` slice_, then merge

**D. Data/ETL & Casework**

- **#716 `CSV cleaning script`** → _Merge after CI green_; tag `A:ingest`
- **#713 `case core service skeleton`** → _Merge into `server/core` slice_ or rebase after it

**E. Docs/Style**

- **#711 `ga closeout brief`** → merge as docs‑only
- **#715 `resolve merge artifacts`** → merge once CI green; low‑risk

**F. Optional/Defer**

- **#706 `federation gateway & UI`** → _Defer post‑GA_

---

## 5) Branches Updated in Last 3–4 Days (Action)

- `release/ga-core-2025-08-20` — keep as staging; fast‑forward after epics merge
- `release/ga-core` — trunk for GA; PRs should target this unless meta (#717)
- `epic/*` — keep active; ensure each PR links to Issue #714 and Milestone
- `feature/intelgraph-ga-foundation` — source for #709 split
- `codex/*` branches — ensure each is either folded into the canonical PR (#712, etc.) or closed

---

## 6) Comms & Tracking

- Add all items above to **Issue #714** with owners & due dates
- Apply labels: `ga-core`, `epic/A|B|C|D|F`, `P0|P1`
- Comment templates are in “CI Rescue Plan & Patchset”

---

## 7) Success Criteria for this window (by Aug 23 EOD)

- ✅ CI‑rescue PR merged; only `ci` + `policy-ci` are required on `main`
- ✅ #709 split PR #1 (`chore/ci-baseline`) merged; PRs #2–#5 open and passing
- ✅ #712 rebased and green with preview‑only tests
- ✅ #717 rebased; optional checks softened; awaiting downstream merges
- ✅ Release branch fast‑forwarded from epics

_Prepared by Guy — IntelGraph GA Core execution support._
