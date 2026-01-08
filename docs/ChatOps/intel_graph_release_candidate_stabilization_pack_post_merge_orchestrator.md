# IntelGraph — Release Candidate Stabilization Pack (Post‑Merge Orchestrator)

**Status input (from final report):** 47+ PRs merged; \~30 PRs remaining (≈20 with conflicts); 1 complex GraphRAG conflict resolved; TypeScript build failing (7 errors, 865 lint warnings); smoke/integration issues present.

**Prime directive:** Cut a deployable **RC branch** quickly, reduce risk, and preserve velocity.

---

## 0) Executive Summary — What Happens Next (48–72h plan)

**D0 (now → +24h): Compilation Green**

- Create stabilization branch: `release/<YYYY-MM-DD>-stabilization` off `main`.
- Freeze feature PRs; allow only fixes into the stabilization branch.
- Run TS+lint in watch mode; drive errors to **0** and warnings < **50**.
- Regenerate codegen (GraphQL, client/server types). Ensure Node LTS matches deps.
- Rebuild, spin up Compose, run golden-path smoke to baseline failures.

**D1 (+24h → +48h): Smoke & Integration Green**

- Triage smoke failures by service (server, client, workers, data services).
- Add missing envs and schemas; fix breaking API calls introduced by upgrades (Apollo/MUI/RTK/etc.).
- Re-run seed + smoke until green; capture fixes in `MERGE_NOTES.md`.

**D2 (+48h → +72h): CI/QA & RC Cut**

- Lock the dependency graph; enable merge queue for remaining PRs.
- CI must be all green (lint, typecheck, unit, e2e smoke on Linux+Node 18/20).
- Tag `vX.Y.Z-rc.1` and draft release notes.

---

## 1) Branching & Protection

- Create `release/<YYYY-MM-DD>-stabilization` from `main`.
- Protect `main` and the RC branch: required checks: `lint`, `typecheck`, `test`, `smoke`, `build`.
- Enable **merge queue** for `main`.
- Temporarily disable automerge bots to avoid churn during stabilization.

```bash
# setup
git fetch --all --prune
BR=release/$(date +%F)-stabilization
git checkout -B $BR origin/main

git push -u origin $BR
```

---

## 2) TypeScript Error Eradication Playbook (D0)

**Commands**

```bash
# fast feedback
npm -w server run typecheck || npm -w server run build:types || true
npm -w client run typecheck || true

# full compile without emit
npx tsc -b --pretty false --noEmit

# lint (flat config if applicable)
npm run lint --workspaces --if-present --max-warnings=0
```

**Typical failure buckets & fixes**

- **ESM/CJS drift**: Ensure `"type": "module"` alignment; use `.cjs`/`.mjs` appropriately; convert `require`→`import` or vice versa. Add `"moduleResolution": "Bundler"` or `"NodeNext"` where needed.
- **GraphQL codegen drift**: Re-run codegen; update imports for generated types; ensure schema paths correct.
- **Redux Toolkit/React-Redux**: Confirm hooks usage (`useSelector`/`useDispatch`), `configureStore`, `Provider` tree; update legacy patterns.
- **MUI 7**: Normalize imports from `@mui/material`; update theme typings; replace removed lab components.
- **Strict nulls**: Patch resolver/entity guards with narrow types; prefer local `satisfies` to keep inference.
- **Third‑party type bumps**: Pin minimal versions that compile; annotate generics explicitly in async functions.

**Codemods / micro‑patches**

- Add `scripts/ts-patch-rules.md` with recurring patterns fixed.
- For repeated breaking imports, introduce barrel files with stable re‑exports.

---

## 3) Smoke Test Debug Funnel (D1)

**Golden path to validate after each fix batch**

1. Investigation → Entities → Relationships → Copilot → Results.
2. Verify GraphQL introspection & health routes (`/healthz` where present).
3. Seed data present; confirm basic query/command flows.

**Instrumentation**

- Add `scripts/validate-smoke.mjs` to hit critical endpoints and parse 2xx/4xx quickly.
- Emit `X-IG-Request-Id` from gateway; correlate in server/worker logs.

**Common breakpoints**

- Apollo middleware and plugin wiring after upgrade.
- Redis/BullMQ queue names and board adapter routes.
- Env var renames (dotenv major); ensure `.env.example` current.

---

## 4) Remaining 20 Conflict PRs — Merge Queue Plan (D1→D2)

**Heuristics**

- Close superseded dependency bumps; keep only the newest per package.
- Batch by subsystem: (1) infra/tooling, (2) server, (3) client, (4) docs.
- Use `git rerere` to amortize recurring conflict patterns.

**Procedure**

```bash
# list & group
gh pr list --state open --limit 200 --json number,title,labels,headRefName,updatedAt > prs.json
# (manually or via a tiny script) bucketize by labels/headRefName

# per PR
gh pr diff <PR#> --name-only
# if safe → merge (squash). else → checkout and resolve minimal edits.
```

**Conflict resolution rules**

- Prefer the **newest** code path; retain legacy adapters behind feature flags only if needed.
- Keep public API stable; update call‑sites, not signatures, unless migration requires it.
- Resolve lockfile conflicts by **regenerate once per batch**.

---

## 5) CI/CD: Minimal, Fast, Enforced (D0→D2)

Create **single** workflow running on PRs to `main` and the RC branch, plus a nightly.

```
# .github/workflows/ci.yml
name: ci
on:
  pull_request:
    branches: [ main, 'release/**' ]
  push:
    branches: [ main, 'release/**' ]
  workflow_dispatch:

jobs:
  build-test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node: [18, 20]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: ${{ matrix.node }}, cache: 'npm' }
      - run: npm ci
      - run: npm -w server run typecheck
      - run: npm -w client run typecheck
      - run: npm run lint --workspaces --if-present --max-warnings=0
      - run: npm -w server test --if-present -- --ci
      - run: npm -w client test --if-present -- --ci
      - run: npm -w server run build --if-present && npm -w client run build --if-present

  smoke:
    runs-on: ubuntu-latest
    needs: build-test
    services:
      docker: { image: docker:27-dind-rootless }
    steps:
      - uses: actions/checkout@v4
      - run: make up
      - run: make seed || true
      - run: make smoke
```

**Merge queue** (GitHub native): enable for `main`; required checks: `ci (node 18)`, `ci (node 20)`, `smoke`.

---

## 6) Lint/Type Policy

- **Hard fail** on any TS error; **temporary threshold**: ≤50 warnings repo‑wide.
- Add `eslint-rule-overrides.json` documenting intentional exceptions with TODOs and owners.
- Introduce `npm run lint:changed` (lint staged files) to keep PRs small.

---

## 7) Repo Scripts & Make Targets

**Makefile additions**

```
smoke:
	# curl or node script to touch key routes/operations
	node scripts/validate-smoke.mjs

typecheck:
	npx tsc -b --pretty false --noEmit

fix:
	npm run lint --workspaces -- --fix || true

seed:
	# ensure idempotent seed
	node scripts/seed.mjs
```

**scripts/validate-smoke.mjs (skeleton)**

```js
import http from "node:http";
const targets = [
  "http://localhost:4000/healthz",
  "http://localhost:4000/graphql",
  "http://localhost:3000",
];
// TODO: add GraphQL introspection ping & a trivial query
```

---

## 8) Release Candidate Checklist (Gate)

-

Upon green:

```bash
npm version prerelease --preid rc
git push --follow-tags
# open PR: release/<date>-stabilization → main
```

---

## 9) Drafts You Can Paste

### 9.1 Release PR Description

```
release: vX.Y.Z-rc.1 — stabilization after merge sweep

Summary
- 47+ PRs previously merged; this branch fixes type errors, restores builds, and stabilizes smoke tests.
- No new features; bugfixes, migrations, and CI hardening only.

Verification
- typecheck, lint, unit tests green on Node 18/20
- make up && make seed && make smoke green
- Manual golden-path run: Investigation → Entities → Relationships → Copilot → Results

Risk & Rollback
- Moderate (dep majors). Revert plan: revert last fix commits or rollback to pre-stabilization tag.
```

### 9.2 Draft `RELEASE_NOTES.md`

```
## vX.Y.Z-rc.1 (YYYY-MM-DD)

### Highlights
- Build restored across client & server
- Smoke path green, GraphRAG dual‑path preserved
- CI matrix Node 18/20, merge queue enabled

### Fixes & Migrations
- Apollo/MUI/RTK upgrades reconciled
- ESLint/TS strict fixes; warnings capped

### Known Issues
- ~30 PRs remain (≈20 with conflicts) — scheduled through merge queue
```

### 9.3 `MERGE_NOTES.md` sections to append

```
## YYYY-MM-DD Stabilization
- Resolved TS errors: [list by module]
- Key API adjustments: [GraphQL field renames, resolver signatures]
- Client fixes: [MUI theming, RTK selectors]
- Infra: CI workflows, merge queue, smoke script
```

---

## 10) Automation to Prevent Future Conflicts

- **Require typecheck on PRs** and block merges on TS errors.
- **Labeler** to auto‑route reviewers.
- **Autoclose** stale/superseded dependency PRs with a bot comment.

```
# .github/labeler.yml
server: [ 'server/**' ]
client: [ 'client/**' ]
infra:  [ '.github/**', 'Docker*', 'docker/**', 'Makefile' ]
```

Optionally add a `dangerfile.ts` that fails PRs introducing new `any` or raising lint warnings beyond baseline.

---

## 11) Verification Matrix for Major Features (spot checks)

| Feature                | Minimal Validation                                        |
| ---------------------- | --------------------------------------------------------- |
| Zero Trust baseline    | Requests without auth denied; OPA policy unit test passes |
| ABAC/OPA               | Role matrix test fixtures return expected allow/deny      |
| Multi‑tenant GraphQL   | Tenant header routes queries to isolated data set         |
| Graph explainability   | Endpoint returns rationale fields, not 500                |
| Path ranking v2        | Scores sum to 1 (or expected domain invariant)            |
| Entity resolution      | Duplicate inputs map to canonical ID                      |
| STIX/TAXII ingestion   | Ingest sample bundle, entities materialize                |
| LLM budget enforcement | Requests beyond budget rejected with 4xx                  |
| Cytoscape explorer     | Graph renders; node/edge interactions responsive          |
| CRDT graph sync        | Concurrent edits converge within threshold                |

---

## 12) Owner Map & Work Split (suggested)

- **Compilation**: 1–2 devs (server+client), own TS fixes to zero.
- **Smoke**: 1 dev adds/maintains `validate-smoke.mjs` + golden‑path checks.
- **CI**: 1 dev finalizes workflows & merge queue.
- **Conflicts**: 2 devs run the merge queue, batch by subsystem.
- **QA**: 1 dev executes manual golden‑path and logs issues.

---

## 13) Command Cheat‑Sheet

```bash
# fast type/lint loop
npm -w server run typecheck && npm -w client run typecheck && npm run lint --workspaces --max-warnings=0

# docker path
make up && make seed && make smoke

# merge queue basics
gh pr list --state open --limit 200
gh pr diff <PR#> --name-only
gh pr merge <PR#> --squash --auto --delete-branch
```

---

**End of Pack** — Drop this into the repo (docs/) and begin D0 immediately. When green, proceed to D1 and D2 without waiting for new features.
