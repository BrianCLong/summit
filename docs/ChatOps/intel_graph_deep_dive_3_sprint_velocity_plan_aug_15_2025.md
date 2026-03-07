# IntelGraph — Deep‑Dive Technical Review

_Date:_ **Aug 15, 2025**\
_Scope:_ Full‑stack review of the uploaded repository (`intelgraph-main`) with a prescriptive 3‑sprint velocity plan.

---

## 1) Executive Summary

IntelGraph is a multi‑service platform for intelligence analysis with AI‑augmented graph analytics. The stack comprises:

- **Frontend:** React 18 + Vite + MUI, Redux Toolkit, Cytoscape.js graph visualization, Playwright/Jest tests.
- **Backend API:** Node.js/TypeScript (Express + Apollo Server), GraphQL over WS, Neo4j (graph), Postgres (relational), Redis (cache/queues), Kafka connectors.
- **ML Service:** Python FastAPI + Celery tasks (NLP, GNN, GraphRAG/embeddings).
- **Data Eng:** Airflow/Prefect/Dagster deps; ingestion scripts.
- **Observability:** Prometheus metrics, Grafana, health/metrics routes, OpenTelemetry hooks.
- **Security:** OPA/ABAC via Rego policies, PBAC plugin, rate‑limit, Helmet, persisted queries.
- **Ops:** Docker Compose (dev/prod/gpu/streamlit), K8s manifests (logging/security), Terraform skeletons, GitHub Actions CI/CD (tests, image build, code scanning, drift checks).

**Readiness:** Advanced prototype approaching production hardening. Golden‑path and smoke tests exist; several features are implemented behind stubs/TODOs; TS strictness is relaxed; Subscriptions disabled. Focus next sprints on _golden‑path reliability → performance → collaboration latency & security hardening_.

---

## 2) Repository Topography

- **Root**
  - `Makefile` — canonical dev workflow: `make up`, `make seed`, `make smoke`, backups, etc.
  - `docker-compose*.yml` — dev, prod, GPU, OPA, Streamlit variants.
  - `.github/workflows/*.yml` — CI (unit/e2e, security, codeql, image, deploy, smoke), infra drift, DR verify.
  - `k8s/` — logging (fluent‑bit), security checks, monitoring rules stubs.
  - `terraform/` — envs+modules skeleton.
  - `triage/findings.csv` — nascent risk register.

- **client/**
  - `src/` — multiple `App.*.jsx` variants (progressive/minimal/test), graph components (`CytoscapeGraph`, `AdvancedCollaborativeGraph`, LOD/cluster utilities), auth, dashboards.
  - Tests: Jest + React Testing Library + Playwright E2E.

- **server/**
  - `src/index.ts` — Express + Apollo, WS, persisted queries, PBAC plugin, rate limit, Helmet.
  - `graphql/` — schema + resolvers (entity, relationship, investigation, AI analysis, GraphRAG); depth‑limit validator exists but **not wired**.
  - `routes/monitoring.ts` — `/metrics`, `/health` (live/ready), system probes.
  - `middleware/opa.ts` — OPA policy checks and audit hooks.
  - `tests/` — integration/e2e (auth setup, graph operations), smoke tests.

- **ml/**
  - `app/main.py` — FastAPI endpoints, JWT validation/audit, Celery task orchestration.
  - `tasks/` — NLP (entity/relationship extraction, linking), GNN (node/link/anomaly/embeddings) tasks.

---

## 3) Golden Path & Runbook

**Golden Path mantra** is codified in README and Makefile:

- Start dev: `make up` → Compose brings up Neo4j, Postgres, Redis, server, client.
- Seed data: `make seed` (demo/small/large).
- Smoke gate: `make smoke` → JS + Playwright smoke to validate _Investigation → Entities → Relationships → Copilot → Results_.

**Recommendation:** Treat `make smoke` as a CI _required_ check and nightly canary. Add synthetic probes after deploy via `/health/detailed`.

---

## 4) Strengths

- Well‑factored GraphQL schema with AI/GraphRAG affordances; persisted queries and PBAC are integrated.
- Mature CI/CD surface: test workflows (client/server/ml), security scans (CodeQL, gitleaks), drift checks, smoke deployments.
- Observability endpoints and metrics registry; Kubernetes probes provided.
- Rich graph UI with performance‑oriented components (clustering, LOD, lazy layouts).
- Infrastructure hygiene: Makefile, backups scripts, Docker images, seed data workflows.

---

## 5) Gaps / Risks (Actionable)

1. **GraphQL safety not fully enforced:** `depthLimit()` validator exists but is not registered with Apollo.
2. **Subscriptions disabled:** `Subscription` resolvers are commented out; collab features rely on WS but server lacks end‑to‑end subscription support.
3. **TS strictness:** `strict: false`, `allowJs: true`; mixed JS/TS resolvers. Weak typing reduces refactor safety.
4. **Security scanning posture:** `gitleaks` workflow runs with `continue-on-error: true`; `triage/findings.csv` flags secrets scan gap.
5. **TODO hotspots** (selected): Interactive graph cluster highlighting; webhook callbacks for NLP tasks; Kafka Avro deserialization; PBAC Apollo v5 compatibility completion; Copilot orchestrator still using stubs; GraphRAG resolvers cache clearing/fetch by IDs; Multimodal relationship search addition.
6. **Multiple client app entry variants** (`App.*.jsx`) risk configuration drift; define a single canonical entry and prune experiments into `examples/`.
7. **Perf regression watchpoints:** Issue templates highlight _graph rendering lag_ and _GraphQL query perf regression_; ensure Neo4j indexes and Redis caching are tuned and measured.
8. **Audit trail completeness:** Template `issue_05_incomplete_audit_trail.md` indicates gaps; reconcile audit events across server/ML/OPA (+correlation IDs).
9. **Rate limiting & persisted query allow‑list** likely not uniformly enforced on WS endpoints.

---

## 6) Quality & Test Readiness

- **Client:** Jest unit tests + Playwright E2E, golden‑path test spec present.
- **Server:** Jest integration (GraphOps, AI, similarity), Playwright e2e for GraphQL, smoke tests.
- **ML:** Pytest hooks via CI (`python-ci.yml`), health checks.

**Gaps to close:** Flaky test quarantining, explicit _contract tests_ for GraphQL (schema snapshot + typed client with codegen), load tests for top 5 queries.

---

## 7) Security & Compliance Snapshot

- Helmet, rate limiters, persisted queries plugin, PBAC, OPA middleware, audit utils.
- Rego policies (`server/policies/*.rego`) and Gatekeeper scaffolding in `k8s/policies/`.

**Immediate steps:** Fail build on gitleaks findings, wire `depthLimit`, throttle WS subscriptions, verify tenant isolation in resolvers, sign/verify ML JWTs end‑to‑end, centralize audit sink.

---

## 8) Observability & SLOs

- `/health`, `/health/detailed`, `/metrics` exist; Prometheus/Grafana expected.
- Recommend **SLOs** for next release:
  - API p50 < 120ms, p95 < 450ms for _entities_ query at 10 RPS.
  - GraphQL error rate < 1%.
  - WS reconnect success > 99% within 5s.
  - Golden‑path success ≥ 99.5% (hourly).

Instrument with OpenTelemetry for GraphQL resolvers, Neo4j calls, and client web vitals; export RED metrics.

---

## 9) Backlog Seeds (from code signals)

**Security**

- Wire `depthLimit()` into Apollo; cap to depth 8 for external callers; add cost analysis by field.
- Enforce persisted query allow‑list on WS; reject ad‑hoc queries in prod.
- Turn gitleaks to blocking (PR and main); add commit hook mirror.

**Performance**

- Neo4j: create/validate full‑text and type indexes; review `evidenceContentSearch` usage and pagination with `SKIP/LIMIT`.
- Redis: add caching for `entities`/similarity queries with stampede protection.
- Client: enable LOD/cluster by default for >5k nodes; defer styles; virtualize side panels.

**Reliability**

- Stabilize `make smoke` in CI; quarantine flaky specs; add Nightly Load.

**Developer Experience**

- Raise TS `strict` and migrate JS resolvers progressively; enable GraphQL codegen for types.
- Consolidate `App.*.jsx`; codify an example gallery.

**Feature Completes**

- Copilot orchestrator replace stubs, add enrichment/summarization calls; GraphRAG cache clearing; InteractiveGraph cluster highlighting; NLP webhook callbacks; Kafka Avro support.

---

# Two‑Sprint Velocity Plan (Updated Aug 16, 2025)

**Team assumption:** 6 devs (4 full‑stack, 1 FE‑leaning, 1 BE/ML‑leaning).\
**Seed velocity:** **30 points/sprint** (±4) with a 20% unplanned buffer.\
**Point scale:** 1, 2, 3, 5, 8, 13.

> Update: You completed **4 do‑now items** (total **16 pts**): Depth Limit (5), Gitleaks Blocking (3), Canonical App (3), and **Subscriptions Infra** (5, unplanned). We rebalanced Sprint 1 to keep total load \~29 pts by moving **Audit Trail MVP (5)** into Sprint 2.

---

## Sprint 1 — Golden Path Hardening (Updated)

**Target:** 28–32 pts\
**Status:** 16 pts completed; **13 pts remaining** this sprint.

### ✅ Completed (16 pts)

- **Wire GraphQL depthLimit(8) + unit tests** — **5**\
  _Outcome:_ Excessive depth queries rejected with clear errors.
- **Gitleaks to blocking + pre‑commit hook** — **3**\
  _Outcome:_ CI blocks PRs; local commits prevented from adding secrets.
- **Canonicalize client entrypoint** — **3**\
  _Outcome:_ `client/src/App.jsx` canonical; variants moved to `client/examples/`.
- **Subscriptions infrastructure scaffold** — **5** _(unplanned)_\
  _Outcome:_ Subscriptions resolvers enabled; pub/sub firing; e2e framework created.

### 🔜 Remaining in Sprint 1 (13 pts)

1. **Persisted queries: enforce for WS & HTTP in prod** — **5**\
   _AC:_ Non‑persisted operations (HTTP/WS) receive 403 in prod; allow‑list repository and tests updated; CI gate added.
2. **Golden‑path Playwright stabilization & flake quarantine** — **5**\
   _AC:_ `make smoke` passes 10/10 in CI; flake rate < 2%; recorded in flake quarantine list.
3. **Observability bootstrap (RED metrics + Web Vitals export)** — **3**\
   _AC:_ `/metrics` exposes resolver histograms; Grafana dashboard committed; client Web Vitals forwarded to backend.

> **Moved out:** _Audit trail MVP (5 pts)_ → Sprint 2 to preserve this sprint’s capacity after the unplanned Subscriptions work.

**Exit Criteria for Sprint 1:**

- CI required checks: gitleaks, unit/integration, golden‑path smoke, depth limit tests.
- Persisted query allow‑list enforced on both HTTP & WS.
- Resolver metrics visible; dashboard merged.

---

## Sprint 2 — Performance, Security & Audit (Rebalanced)

**Target:** 30–34 pts\
**Goal:** Meet latency SLOs, keep graph UI responsive at scale, and complete audit foundation.

1. **Neo4j indexing + query tuning for hot paths** — **8**\
   _AC:_ Index DDL scripted & idempotent; top queries p95 < 450 ms @ 10 RPS; dashboards include slow‑query panel.
2. **Read‑through Redis caching (entities/similarity)** — **5**\
   _AC:_ Cache hit > 70% on hot keys; stampede protection; cache‑bust on relevant mutations.
3. **Graph performance defaults (LOD/cluster + Perf Mode)** — **5**\
   _AC:_ 10k nodes initial render < 2s; pan/zoom FPS > 30 on reference dataset; toggle documented.
4. **PBAC/OPA end‑to‑end with deny reasons** — **5**\
   _AC:_ Field‑level checks enforced; policy test suite added; deny events produce structured audit records.
5. **Audit trail MVP (moved from S1)** — **5**\
   _AC:_ Central audit schema; events for auth, entity/rel CRUD, ML task submit/finish with correlation IDs; export sink configurable.
6. **Nightly load test job (k6/artillery)** — **3**\
   _AC:_ Scenario for top 5 queries; thresholds bound to SLOs; artifacts uploaded and trended.

**Planned total:** **31 pts**\
**Stretch (if headroom remains):** Subscriptions backpressure & coalescing (batched deltas, debounce, p95 < 250 ms intra‑DC) — **5 pts**.

---

## Definition of Done (per sprint)

- Tests present (unit/integration/e2e as appropriate); golden‑path smoke green in PR & main.
- Security checks (gitleaks, CodeQL) green.
- Metrics dashboards updated; SLOs measured.
- Docs/runbooks updated.

---

## Risks & Mitigations (unchanged)

- **Perf regressions** under realistic datasets → nightly load tests + query budgets.
- **Type migrations slowing delivery** → progressive TS strict zones; GraphQL codegen.
- **WS scaling** with many subscribers → backpressure limits, fan‑out service, or Redis pub/sub.

---

## Tracking & Reporting (unchanged)

- **Velocity:** committed vs completed; control chart trend.
- **CFD:** WIP limits: 2 per engineer.
- **Quality:** flake rate, failed smoke runs, error budgets.
- **Security:** number of denied OPA ops with reasons, secrets findings = 0.

---

### Appendix — Notable TODOs (selection)

- InteractiveGraphExplorer: highlight cluster nodes.
- NLP tasks: webhook callbacks for `callback_url`.
- Kafka consumer: Avro deserialization.
- PBAC compatibility for Apollo v5.
- Copilot orchestrator: replace simulated calls with actual services (Neo4j, analytics, summarization, enrichment).
- GraphRAG resolvers: fetch full entities by IDs; implement cache clearing.
- Multimodal relationship search.

---

# GitHub Issues & Project Board — Ready‑to‑Run Kit (Aug 16, 2025)

> Use the **GitHub CLI (**``**)** to create milestones, labels, issues, and a Projects (v2) board in one go. Adjust OWNER/REPO if needed. Sprint dates assume a 2‑week cadence starting **Mon, Aug 18, 2025**. Update if your cadence differs or you observe a holiday.

## Sprint Dates & Milestones

- **M‑Sprint‑1** — due **Fri, Aug 29, 2025**
- **M‑Sprint‑2** — due **Fri, Sep 12, 2025**

## Standard Labels (create once)

`area:server`, `area:client`, `area:ml`, `area:infra`, `type:security`, `type:perf`, `type:reliability`, `type:devex`, `sprint:1`, `sprint:2`, `points:1`, `points:2`, `points:3`, `points:5`, `points:8`, `points:13`, `goal`, `backlog`, `stretch`

## Issues to Create

Below are structured issue specs. A script is provided afterward to create them automatically with `gh`. Points reflect planning estimates.

### Sprint 1 (remaining 13 pts)

1. **Enforce persisted queries on WS & HTTP in production** — _5 pts_\
   **Labels:** `area:server`,`type:security`,`sprint:1`,`points:5`\
   **Milestone:** M‑Sprint‑1\
   **Body:**

- **Why:** Eliminate ad‑hoc GraphQL ops in prod across both transports to mitigate query abuse.
- **Scope:** Apply allow‑list enforcement to `graphql-ws` and HTTP; return 403 for non‑persisted ops in prod.
- **Acceptance Criteria:**
  - Non‑persisted HTTP and WS operations are rejected in prod with 403 and structured error.
  - Allow‑list repository committed; tests updated.
  - CI gate enforces persisted‑only in `production` env matrix.
- **Test Plan:** Playwright/e2e covers rogue WS op; unit covers plugin/middleware path.
- **DoD:** Docs updated; dashboard panel tracking 403 counts.

2. **Golden‑path Playwright stabilization & flake quarantine** — _5 pts_\
   **Labels:** `area:client`,`type:reliability`,`sprint:1`,`points:5`\
   **Milestone:** M‑Sprint‑1\
   **Body:**

- **Why:** Reduce CI noise and ensure predictable delivery.
- **Acceptance Criteria:**
  - `make smoke` passes **10/10** CI runs on main.
  - Flaky specs tagged and quarantined with owner + ticket to deflake.
  - Retry strategy and network idling tuned; flake rate < 2%.
- **Test Plan:** CI job with 10x reruns; report artifact published.
- **DoD:** Required PR check; flake‑report doc added.

3. **Observability bootstrap (resolver RED + Web Vitals)** — _3 pts_\
   **Labels:** `area:server`,`type:reliability`,`sprint:1`,`points:3`\
   **Milestone:** M‑Sprint‑1\
   **Body:**

- **Why:** Establish baseline SLO telemetry.
- **Acceptance Criteria:**
  - `/metrics` exposes `graphql_resolver_duration_seconds` histogram & error counter for top 5 resolvers.
  - Grafana dashboard JSON committed.
  - Client Web Vitals forwarded to backend and recorded.
- **Test Plan:** Unit for metrics registration; manual check dashboard loads with data.
- **DoD:** Dashboards linked in README.

### Sprint 2 (31 pts)

4. **Neo4j indexing & query tuning for hot paths** — _8 pts_\
   **Labels:** `area:server`,`type:perf`,`sprint:2`,`points:8`\
   **Milestone:** M‑Sprint‑2\
   **Body:**

- **Why:** Meet p95 latency SLOs.
- **Acceptance Criteria:**
  - Index DDL scripted & idempotent; applied in dev/staging.
  - `entities`/search queries p95 < **450 ms** @ **10 RPS** on reference dataset.
  - Slow‑query panel added to Grafana.
- **Test Plan:** k6/artillery scenario; capture p95.

5. **Read‑through Redis cache for entities/similarity** — _5 pts_\
   **Labels:** `area:server`,`type:perf`,`sprint:2`,`points:5`\
   **Milestone:** M‑Sprint‑2\
   **Body:**

- **Acceptance Criteria:**
  - Cache hit > **70%** on hot keys; TTL and stampede protection in place.
  - Cache‑bust on mutations with targeted invalidation.
- **Test Plan:** Unit for cache policy; load test for hit rate.

6. **Graph perf defaults (LOD/cluster + Performance Mode)** — _5 pts_\
   **Labels:** `area:client`,`type:perf`,`sprint:2`,`points:5`\
   **Milestone:** M‑Sprint‑2\
   **Body:**

- **Acceptance Criteria:**
  - 10k nodes initial render < **2 s**; pan/zoom FPS > **30**.
  - Toggle documented; persists per user/session.
- **Test Plan:** Playwright perf step (trace + metrics) on reference dataset.

7. **PBAC/OPA end‑to‑end with deny reasons** — _5 pts_\
   **Labels:** `area:server`,`type:security`,`sprint:2`,`points:5`\
   **Milestone:** M‑Sprint‑2\
   **Body:**

- **Acceptance Criteria:**
  - Field‑level checks enforced; deny reasons logged & metered.
  - Policy unit tests for role × tenant matrix.
- **Test Plan:** Resolver contract tests; OPA policy tests.

8. **Audit trail MVP (centralized, correlated)** — _5 pts_\
   **Labels:** `area:server`,`type:reliability`,`sprint:2`,`points:5`\
   **Milestone:** M‑Sprint‑2\
   **Body:**

- **Acceptance Criteria:**
  - Central audit schema; events for auth, entity/rel CRUD, ML submit/finish.
  - Correlation IDs propagated across server/ML/OPA.
  - Optional sink (e.g., ELK) behind feature flag.
- **Test Plan:** Integration tests verify end‑to‑end event flow.

9. **Nightly load test job (k6/artillery)** — _3 pts_\
   **Labels:** `area:infra`,`type:reliability`,`sprint:2`,`points:3`\
   **Milestone:** M‑Sprint‑2\
   **Body:**

- **Acceptance Criteria:**
  - CI job runs nightly; thresholds align to SLOs.
  - Trend artifacts uploaded; failures page PRs with link to report.

### Stretch & Backlog (not in sprint totals)

10. **Subscriptions backpressure & coalescing** — _5 pts_\
    **Labels:** `area:server`,`type:perf`,`stretch`,`points:5`\
    **Body:** Batch/coalesce deltas; target p95 delta‑sync < **250 ms** intra‑DC under moderate fan‑out.

11. **Secret history remediation** — _3 pts_\
    **Labels:** `area:infra`,`type:security`,`backlog`,`points:3`\
    **Body:** Purge 3 historical secrets; rotate any live keys; enable push‑protection & GH secret scanning alerts.

12. **GraphQL contract tests (schema/codegen)** — _3 pts_\
    **Labels:** `area:server`,`type:reliability`,`backlog`,`points:3`\
    **Body:** Add schema snapshot + typed client codegen; alert on breaking changes.

---

## One‑Shot Bootstrap Script (GitHub CLI)

> Save as `project-bootstrap.sh`, `chmod +x project-bootstrap.sh`, then run: `OWNER=your-org-or-user REPO=intelgraph-main ./project-bootstrap.sh`

```bash
#!/usr/bin/env bash
set -euo pipefail
: "${OWNER:?Set OWNER}" : "${REPO:?Set REPO}"

# 0) Preconditions
command -v gh >/dev/null || { echo "Install GitHub CLI: https://cli.github.com"; exit 1; }

# 1) Labels
labels=(
  "area:server" "area:client" "area:ml" "area:infra"
  "type:security" "type:perf" "type:reliability" "type:devex"
  "sprint:1" "sprint:2" "points:1" "points:2" "points:3" "points:5" "points:8" "points:13"
  "goal" "backlog" "stretch"
)
for l in "${labels[@]}"; do gh label create "$l" -R "$OWNER/$REPO" --force >/dev/null || true; done

echo "Labels ensured."

# 2) Milestones
S1_DUE="2025-08-29T23:59:59Z"
S2_DUE="2025-09-12T23:59:59Z"
S1_ID=$(gh api -X POST repos/$OWNER/$REPO/milestones -f title='M-Sprint-1' -f state='open' -f due_on="$S1_DUE" -q .number || true)
S2_ID=$(gh api -X POST repos/$OWNER/$REPO/milestones -f title='M-Sprint-2' -f state='open' -f due_on="$S2_DUE" -q .number || true)
# If they exist, fetch their numbers
S1_ID=${S1_ID:-$(gh api repos/$OWNER/$REPO/milestones -q '.[] | select(.title=="M-Sprint-1") | .number')}
S2_ID=${S2_ID:-$(gh api repos/$OWNER/$REPO/milestones -q '.[] | select(.title=="M-Sprint-2") | .number')}

echo "Milestones: S1=$S1_ID S2=$S2_ID"

# 3) Helper to create issues
create_issue() {
  local title=$1 milestone=$2 labels=$3 body=$4
  gh issue create -R "$OWNER/$REPO" --title "$title" --milestone "$milestone" --label "$labels" --body "$body" -q .url
}

# 4) Sprint 1 issues
I1=$(create_issue \
  "Enforce persisted queries on WS & HTTP in production" "$S1_ID" \
  "area:server,type:security,sprint:1,points:5" \
  $'Why: Eliminate ad-hoc GraphQL ops in prod across both transports.
AC:
- Non-persisted HTTP & WS ops rejected in prod with 403 and structured error.
- Allow-list repo committed; tests updated.
- CI gate enforces persisted-only in production.
Test Plan: e2e rogue WS op; unit for middleware.
DoD: Docs updated; dashboard panel for 403s.')
I2=$(create_issue \
  "Golden-path Playwright stabilization & flake quarantine" "$S1_ID" \
  "area:client,type:reliability,sprint:1,points:5" \
  $'AC:
- make smoke passes 10/10 in CI.
- Flaky specs tagged/quarantined with owner.
- Retry & network idling tuned; flake rate < 2%.
Test Plan: CI 10x rerun with artifact report.
DoD: PR required check; flake report doc added.')
I3=$(create_issue \
  "Observability bootstrap (resolver RED + Web Vitals)" "$S1_ID" \
  "area:server,type:reliability,sprint:1,points:3" \
  $'AC:
- /metrics exposes resolver histograms & error counter for top 5 resolvers.
- Grafana dashboard JSON committed.
- Client Web Vitals forwarded and recorded.
Test Plan: unit for metrics registration; manual dashboard check.
DoD: Dashboards linked in README.')

echo "Sprint 1 issues:
$I1
$I2
$I3"

# 5) Sprint 2 issues
I4=$(create_issue \
  "Neo4j indexing & query tuning for hot paths" "$S2_ID" \
  "area:server,type:perf,sprint:2,points:8" \
  $'AC:
- Index DDL scripted & idempotent; applied in dev/staging.
- entities/search p95 < 450 ms @ 10 RPS on reference dataset.
- Slow-query Grafana panel added.
Test Plan: k6/artillery scenario; capture p95.')
I5=$(create_issue \
  "Read-through Redis cache for entities/similarity" "$S2_ID" \
  "area:server,type:perf,sprint:2,points:5" \
  $'AC:
- Cache hit > 70% on hot keys; TTL & stampede protection.
- Cache-bust on mutations with targeted invalidation.
Test Plan: unit for cache policy; load test for hit rate.')
I6=$(create_issue \
  "Graph perf defaults (LOD/cluster + Performance Mode)" "$S2_ID" \
  "area:client,type:perf,sprint:2,points:5" \
  $'AC:
- 10k nodes initial render < 2 s; pan/zoom FPS > 30.
- Toggle documented; persists per user/session.
Test Plan: Playwright perf step (trace + metrics).')
I7=$(create_issue \
  "PBAC/OPA end-to-end with deny reasons" "$S2_ID" \
  "area:server,type:security,sprint:2,points:5" \
  $'AC:
- Field-level checks enforced; deny reasons logged & metered.
- Policy tests for role x tenant matrix.
Test Plan: resolver contract tests; OPA policy tests.')
I8=$(create_issue \
  "Audit trail MVP (centralized, correlated)" "$S2_ID" \
  "area:server,type:reliability,sprint:2,points:5" \
  $'AC:
- Central audit schema; events for auth, entity/rel CRUD, ML submit/finish.
- Correlation IDs across server/ML/OPA.
- Optional ELK sink behind feature flag.
Test Plan: integration verifies end-to-end event flow.')
I9=$(create_issue \
  "Nightly load test job (k6/artillery)" "$S2_ID" \
  "area:infra,type:reliability,sprint:2,points:3" \
  $'AC:
- Nightly CI job executes; thresholds bound to SLOs.
- Trend artifacts uploaded; failures page PRs with report link.')

# Stretch & Backlog
I10=$(create_issue \
  "Subscriptions backpressure & coalescing" "" \
  "area:server,type:perf,stretch,points:5" \
  $'Goal: Batch/coalesce deltas; target p95 delta-sync < 250 ms intra-DC under moderate fan-out.')
I11=$(create_issue \
  "Secret history remediation" "" \
  "area:infra,type:security,backlog,points:3" \
  $'Purge 3 historical secrets; rotate keys; enable push-protection & GH secret scanning alerts.')
I12=$(create_issue \
  "GraphQL contract tests (schema/codegen)" "" \
  "area:server,type:reliability,backlog,points:3" \
  $'Add schema snapshot + typed client codegen; alert on breaking changes.')

printf "Sprint 2 issues:
%s
%s
%s
%s
%s
%s
" "$I4" "$I5" "$I6" "$I7" "$I8" "$I9"
echo "Stretch & backlog:
$I10
$I11
$I12"

# 6) Create a Projects (v2) board and add issues
# Choose OWNER scope (user or org). Repo-scoped projects aren’t supported in Projects v2.
PROJECT_TITLE="IntelGraph Delivery"
PROJECT_ID=$(gh project create --owner "$OWNER" --title "$PROJECT_TITLE" -q .id || gh project list --owner "$OWNER" --format json | jq -r ".[] | select(.title==\"$PROJECT_TITLE\") | .id")
PROJECT_NUMBER=$(gh project view "$PROJECT_ID" --format json -q .number)

echo "Project created: $PROJECT_TITLE (#$PROJECT_NUMBER)"

# Add issues to project and set Status=Todo
add_to_project() {
  local issue_url=$1
  local item_id
  item_id=$(gh project item-add --owner "$OWNER" --project-number "$PROJECT_NUMBER" --url "$issue_url" -q .id)
  # Try to set built-in Status field to Todo (if exists)
  gh project item-update --owner "$OWNER" --project-number "$PROJECT_NUMBER" --id "$item_id" --field "Status" --value "Todo" >/dev/null || true
}

for url in "$I1" "$I2" "$I3" "$I4" "$I5" "$I6" "$I7" "$I8" "$I9" "$I10" "$I11" "$I12"; do
  add_to_project "$url"
  echo "Added to project: $url"
done

echo "All set. Review the board at: https://github.com/orgs/$OWNER/projects/$PROJECT_NUMBER"
```

---

## (Optional) Nightly Load Test Workflow (Sprint 2)

Save as `.github/workflows/nightly-load.yml`.

```yaml
name: Nightly Load Test
on:
  schedule:
    - cron: "0 7 * * *" # 12:00 AM Denver
  workflow_dispatch: {}

jobs:
  k6:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: grafana/setup-k6-action@v1
      - name: Run load test
        run: |
          k6 run tests/load/entities_scenario.js --vus 10 --duration 5m \
            --summary-export load-summary.json
      - name: Upload summary
        uses: actions/upload-artifact@v4
        with:
          name: k6-summary
          path: load-summary.json
```

## (Optional) Flake Report Artifact (Sprint 1)

Add this step to your `playwright.yml` to rerun and publish a flake report.

```yaml
- name: Rerun flaky specs and publish report
  if: failure()
  run: |
    npx playwright test --retries=2 || true
    npx playwright show-report
```

---

## Sprint 6 — AI Insight Enrichment (Status: **Complete**, Aug 16, 2025)

**Delivered (per your update):**

- **PyTorch GNN Link Predictor** — `ml/models/predictive_links.py` (GCN layers, confidence scoring, factories, tests scaffolding)
- **HuggingFace Sentiment Analysis** — `python/nlp/sentiment.py` (entity content analysis with graceful mock fallback)
- **InsightPanel React Component** — `client/src/components/InsightPanel.jsx` (MUI + Redux; sentiment, link preds, summaries; loading/error UX)
- **AI API Endpoints** — `server/src/routes/ai.ts`
  - `POST /api/ai/predict-links`
  - `POST /api/ai/analyze-sentiment`
  - `POST /api/ai/generate-summary`
  - `GET  /api/ai/models/status`
  - (Rate‑limit, validation, error handling present)
- **Project Management** — labels `type-feature`, `area-AI`, `area-UX`, `backend`, `priority-high`; issues **#302–#306** with SP (13–18 total)

**Architecture notes:** modular, API‑first, TS‑typed, graceful degradation; batch/caching considered.

### Post‑Implementation Validation & Ops Readiness (add to Definition of Done)

**Functional**

- **Performance SLOs (initial targets)**

- **Observability**

- **Security & Compliance**

- **Data Lifecycle**

- ***

### Alignment with Current Two‑Sprint Plan

- **Sprint 1:** Fold AI metrics into _Observability bootstrap_ (resolver + AI panels).
- **Sprint 2:** Include AI endpoints in _Nightly load test_; extend _PBAC/OPA_ scope to cover `/api/ai/*` routes; evaluate Redis read‑through for sentiment summaries and link‑pred caches.

---

## AI Enrichment — Issue Pack (Ready‑to‑Run with `gh`)

> This addendum augments the earlier bootstrap without altering existing issues. It ensures AI‑specific labels and creates focused tickets aligned to S1/S2.

**New/ensured labels:** `area-AI`, `area-UX`, `type-feature`, `priority-high`

```bash
#!/usr/bin/env bash
set -euo pipefail
: "${OWNER:?Set OWNER}" : "${REPO:?Set REPO}"

# Ensure labels used by AI work
for l in area-AI area-UX type-feature priority-high; do gh label create "$l" -R "$OWNER/$REPO" --force >/dev/null || true; done

# Look up milestones if they exist
S1_ID=$(gh api repos/$OWNER/$REPO/milestones -q '.[] | select(.title=="M-Sprint-1") | .number' || true)
S2_ID=$(gh api repos/$OWNER/$REPO/milestones -q '.[] | select(.title=="M-Sprint-2") | .number' || true)

mk() { gh issue create -R "$OWNER/$REPO" --title "$1" --label "$2" ${3:+--milestone "$3"} --body "$4" -q .url; }

A1=$(mk "AI observability: metrics & dashboards for /api/ai/*" "area-AI,type:reliability,sprint:1,points:3,priority-high" "$S1_ID" $'Export ai_* metrics; add Grafana panels with SLOs and alerts. AC: metrics present, dashboard JSON committed, alerts firing in staging.')
A2=$(mk "Security: input validation, PII redaction & rate limits for AI endpoints" "area-AI,type:security,sprint:1,points:3,priority-high" "$S1_ID" $'Add JSON schema validation, size limits, PII redaction in logs; prove rate-limit budgets with tests. AC: e2e negative tests pass.')
A3=$(mk "Performance: batch & cache for link prediction" "area-AI,type:perf,sprint:2,points:5" "$S2_ID" $'Implement batch inference and read-through cache; stampede protection; hit ratio >60%. AC: load test meets SLOs; cache metrics reported.')
A4=$(mk "Model lifecycle: versioned status + model card" "area-AI,type:feature,sprint:2,points:3" "$S2_ID" $'Expose model version/build in /models/status; publish model card & changelog; pin versions in config.')
A5=$(mk "InsightPanel: accessibility & UX polish" "area-UX,type:feature,sprint:2,points:3" "$S2_ID" $'Ensure focus states, ARIA labels, keyboard nav; responsive polish; writing guidelines for AI copy.')
A6=$(mk "E2E: AI workflow happy-path & failure-path tests" "area-AI,type:reliability,sprint:2,points:3" "$S2_ID" $'Playwright covers panel → API → render; simulate timeouts/fallbacks; record traces as artifacts.')

echo "Created AI issues:
$A1
$A2
$A3
$A4
$A5
$A6"

# Optionally add to existing project board
if gh project list --owner "$OWNER" --format json >/dev/null 2>&1; then
  PID=$(gh project list --owner "$OWNER" --format json | jq -r '.[] | select(.title=="IntelGraph Delivery") | .number')
  if [ -n "$PID" ]; then
    for url in "$A1" "$A2" "$A3" "$A4" "$A5" "$A6"; do
      iid=$(gh project item-add --owner "$OWNER" --project-number "$PID" --url "$url" -q .id)
      gh project item-update --owner "$OWNER" --project-number "$PID" --id "$iid" --field "Status" --value "Todo" >/dev/null || true
    done
    echo "AI issues added to project #$PID"
  fi
fi
```

**Suggested points & placement:** S1 (A1, A2 = 6 pts total) to bundle with observability/security hardening; S2 (A3–A6 = 14 pts) if capacity allows, otherwise move A5 to backlog.

---

### Release Notes Template (AI Insight Enrichment)

- **Features:** InsightPanel (sentiment, link predictions, summaries); new AI endpoints; model status endpoint.
- **Performance:** batch/caching support (experimental).
- **Security:** rate‑limit & validation on AI endpoints; logs redaction (if enabled).
- **Known limits:** link‑prediction accuracy on sparse graphs; model warm‑up latency after cold start.
- **Toggles/flags:** `ai.insightPanel.enabled`, `ai.cache.enabled`, `ai.batch.enabled`.

---
