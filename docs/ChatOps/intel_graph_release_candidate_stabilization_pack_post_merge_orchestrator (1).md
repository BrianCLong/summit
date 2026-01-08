# IntelGraph — Release Candidate Stabilization Pack (Post‑Merge Orchestrator)

**Status input (from final report):** 47+ PRs merged; \~74 PRs remaining (expect >50% with conflicts); 1 complex GraphRAG conflict resolved; TypeScript build failing (7 errors, 865 lint warnings); smoke/integration issues present.

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

## 4) Remaining 74 PRs — Merge Queue Plan (D1→D2)

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
- ~74 PRs remain (expect >50% with conflicts) — scheduled through merge queue
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

---

## 14) Scaling Strategy for 74 Remaining PRs — Triage → Batches → Merge Queue

**Goal:** Merge all feasible PRs safely in **9–12 batches**, always keeping `main` deployable.

### 14.1 Triage (60–90 min)

```bash
# dump PRs to CSV/JSON
gh pr list --state open --limit 200 \
  --json number,title,labels,headRefName,baseRefName,author,updatedAt,isDraft \
  | jq -r '.[] | ["#"+(.number|tostring), .title, (.labels|map(.name)|join(";")), .headRefName, .updatedAt] | @tsv' > prs.tsv
```

**Bucket by subsystem** (regex match on title/branch/labels):

- **infra**: (eslint|lint|husky|prettier|gh|workflow|docker|compose|helm|k8s|opa|policy)
- **server**: (apollo|graphql|resolver|schema|worker|queue|bull|redis|neo4j|postgres|prisma|typeorm)
- **client**: (mui|react|vite|redux|rtk|date-fns|cytoscape)
- **security**: (opa|rbac|abac|oauth|oidc|jwt)
- **observability**: (otel|prometheus|grafana|loki|sentry|datadog)
- **content/docs**: (readme|docs|examples)

Mark superseded dependabot PRs (older bumps for same package). Close them with a standard note and keep only the newest per package.

### 14.2 Batch Plan (example)

1. **Batch A: Tooling & CI** — eslint, typescript config, lint-staged, GH workflows.
2. **Batch B: Type plumbing** — codegen, @types/\*, tsconfig, ESM/CJS alignment.
3. **Batch C: Backend Core** — Apollo Server, GraphQL libs, server build.
4. **Batch D: Data/Infra** — Neo4j/Postgres drivers, Redis/BullMQ, migrations.
5. **Batch E: Backend Features** — microservices merges gated behind flags.
6. **Batch F: Frontend Core** — React, React-Redux/RTK, Vite.
7. **Batch G: Frontend UI** — MUI, Cytoscape, date-fns.
8. **Batch H: Security** — OPA/ABAC/RBAC threads.
9. **Batch I: Observability** — OTel, dashboards, alerts.
10. **Batch J: Docs & Samples**.

Aim for **5–8 PRs/batch**. If a PR spans multiple subsystems, defer it to the later of those subsystems or split the PR (if owned by us).

### 14.3 Execution Loop (per batch)

```bash
# 0) prepare
BR=release/$(date +%F)-merge-sweep
git checkout -B $BR origin/main

# 1) preview each PR
for N in <PR_NUMBERS>; do gh pr diff $N --name-only; done

# 2) merge safest first, squash, delete branch
for N in <BATCH_SAFE_NUMS>; do gh pr merge $N --squash --auto --delete-branch; done

# 3) resolve conflicts on the rest (one-by-one)
#    - keep public APIs stable; adapt call-sites
#    - prefer smallest edits; repeat via git rerere

# 4) once merged, regenerate lockfile ONCE
rm -f package-lock.json && npm i

# 5) typecheck + build + smoke
npm -w server run typecheck && npm -w client run typecheck
npm -w server run build && npm -w client run build
make up && make seed && make smoke
```

**Close-out:** Update `MERGE_NOTES.md` with PR list & key decisions; push; open batch PR to `main` via merge queue.

### 14.4 Conflict Playbooks (copy/paste fixes)

- **Lockfile thrash:** Delete lockfile → `npm i` once/batch; never hand-merge JSON conflicts.
- **Apollo v5 middleware:** Ensure `expressMiddleware(server, { context })` wiring aligns; re-run schema/codegen; fix plugin hook names.
- **MUI v7 imports:** Replace deep paths; use `@mui/material` and stable theme typing.
- **Redux Toolkit 2 / React-Redux 9:** Ensure `configureStore`, typed hooks, and React 18 root.
- **ESM/CJS drift:** Align `package.json` `type` fields; convert default imports; prefer `import.meta` over `__dirname`.
- **BullMQ / Bull Board:** Verify board adapter initialization and auth; queue names in one constants file.
- **dotenv/date-fns majors:** Normalize import style and env loading order (dotenv before any config access).

### 14.5 Automation helpers

```bash
# Close older dependabot PRs superseded by newer bumps of same pkg
# (pseudo)
for PKG in $(awk '{print $2}' prs.tsv | grep dependabot | sort -u); do
  OLDS=$(grep "$PKG" prs.tsv | sort -V | head -n -1 | cut -f1)
  for P in $OLDS; do gh pr close ${P#\#} --comment "Superseded by newer bump for $PKG"; done
done

# Bucket labeler (optional)
for N in $(cut -f1 prs.tsv | tr -d '#'); do
  gh pr edit $N --add-label "batch:pending"; done
```

---

## 15) Live Wiring — Staging & Production (Make it work live)

**Objective:** Stand up a **staging** environment that mirrors prod, then promote to prod via canary.

### 15.1 Prereqs

- **Registry:** Push images tagged with git SHA + semver pre-release (e.g., `server:sha-<short>` and `server:vX.Y.Z-rc.1`).
- **Secrets:** Use SOPS/SealedSecrets or GitHub Encrypted Secrets for: DB URLs (Postgres, Neo4j), Redis, OIDC credentials, OPA bundle URL, third‑party API keys, LLM provider keys, JWT secrets.
- **TLS & Ingress:** cert-manager + Ingress (nginx/traefik).
- **Observability:** OTel Collector → Prometheus/Grafana + logs (Loki or vendor).

### 15.2 Build & Publish

```bash
# in CI
docker build -f docker/server.Dockerfile -t $REG/server:$GIT_SHA server
docker build -f docker/client.Dockerfile -t $REG/client:$GIT_SHA client

docker push $REG/server:$GIT_SHA
docker push $REG/client:$GIT_SHA
# optionally retag rc
```

### 15.3 Deploy (Helm/Kustomize sketch)

Values to set:

- `image.tag`: `$GIT_SHA`
- `env`: `NODE_ENV=production`, `PUBLIC_URL`, `GRAPHQL_URL`, `REDIS_URL`, `POSTGRES_URL`, `NEO4J_URI`, `NEO4J_AUTH`, `OPA_URL`, `OPA_BUNDLE`, `LLM_BUDGET_*`
- HPA min/max replicas; resource requests/limits.
- Ingress hosts + TLS secrets.

```bash
# helm example
helm upgrade --install intelgraph charts/intelgraph \
  -n intelgraph --create-namespace \
  -f deploy/values-staging.yaml --set image.tag=$GIT_SHA
```

### 15.4 Data & Migrations

- Run **Postgres migrations** before app rollout.
- Apply **Neo4j constraints/indexes** idempotently.
- Seed minimal tenant + sample entities for smoke.

### 15.5 Post‑Deploy Smoke (Cluster)

```bash
BASE=https://staging.example.com
curl -sf $BASE/healthz || exit 1
# GraphQL trivial query (anon or auth token)
curl -sf -H "Content-Type: application/json" \
  -d '{"query":"query{__typename}"}' $BASE/graphql | jq .
# Frontend probe
curl -sf $BASE | grep -i "<title" || exit 1
```

### 15.6 Canary → Full rollout

- Route 10% traffic to new `image.tag` for 30–60m while monitoring 4 golden signals.
- Promote to 100% if SLOs hold; otherwise rollback image tag.

### 15.7 Feature Flags & Safety

- Gate risky services (GraphRAG, cognitive insights) with flags and circuit breakers.
- Enforce **LLM budget** via env + middleware; alert on threshold breaches.

### 15.8 Access & Security

- OPA/ABAC: confirm deny-by-default policies; unit tests for role matrix.
- RBAC on Bull Board / Admin UIs via Ingress auth.
- Multi‑tenant header contract documented and enforced at gateway.

### 15.9 Observability

- Ensure server/client export OTel traces; sample 1–5% in staging.
- Dashboards: GraphQL latency, error rate; worker queue depth & stall rate; Neo4j/PG queries per sec.
- Alerts: smoke failure, 5xx spike, queue stall, budget exceeded.

---

## 16) Backout, Data Safety & Runbooks

- **Rollback**: Previous image tag + keep DB migrations **additive**; provide `down` only when verified safe.
- **Config drift**: Use `helm diff`/`kustomize` previews on each deploy.
- **Runbooks**:
  - GraphQL outage: scale server to 0 → roll to previous tag → scale up.
  - Queue jam: drain queue; pause producers; fix consumer; resume.
  - Neo4j hot index: add/adjust index; restart pod off-hours.

---

## 17) Token‑Frugal Agent Playbook (for 74 PRs)

- **Diff‑first:** `gh pr diff <N> --name-only`; load only hunks you edit.
- **Batch memory:** Persist tiny notes (title → key files touched; risk level).
- **Standard edits:** maintain a snippet library (imports, ESM fixups, MUI/RTK changes) and reuse.
- **Conflict summaries:** Before editing, summarize conflicts in bullets and propose the minimal patch.
- **Lockfile discipline:** regenerate once per batch only.
- **Decision log:** Append 3–6 bullets per batch to `MERGE_NOTES.md`.

---
