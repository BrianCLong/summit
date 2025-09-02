# Autonomous Build Operator — Full Roadmap & Tuning Guide

_A complete plan to design, implement, and scale a semi/fully autonomous build operator that coordinates all development resources in parallel, maximizes subscription utility, and remains tunable from manual to hands‑off autonomy with granular controls._

---

## 0) Scope & Objectives

**Goal:** Build an operator that can plan, code, test, review, and deploy small, ticket‑sized increments across many repos and services in parallel, using premium external services where they’re strongest, and local/agentic automation where appropriate.

**Success Criteria**

- **Throughput:** ≥3× tickets/week vs. baseline with equal or lower defect rate.
- **Quality:** PR acceptance rate ≥85% without rework; test coverage Δ ≥ +10% in first quarter.
- **Efficiency:** Cost per merged PR ↓ 30% while keeping p95 lead time ≤ 48h for small tickets.
- **Safety:** Zero policy breaches; rollback < 10m MTTR; full audit trail on all actions.

---

## 1) Operating Modes & Autonomy Spectrum

**Autonomy Levels (per action class: PLAN / FETCH / GENERATE / EXECUTE / MERGE / DEPLOY):**

- **A0 — Manual:** Operator proposes; humans plan/approve/execute.
- **A1 — Assisted:** Operator proposes plan + diffs; human approves applies.
- **A2 — Guarded Auto‑Plan:** Plans and drafts PRs; merges only with explicit approval.
- **A3 — Auto‑Merge (low‑risk):** Merges trivial/green PRs under policy (docs, comments, lint, test‑only).
- **A4 — Auto‑Deploy (canary):** Canary + auto‑rollback with strict SLO gates.
- **A5 — Fully Autonomous:** End‑to‑end within defined blast radius and budget.

**Profiles** (example presets):

- **Prod‑Conservative:** A2 across the board; A3 for docs/tests; A4 only for feature‑flagged toggles.
- **Staging‑Aggressive:** A4 for services with strong tests; A5 for docs sites and SDK samples.
- **Exploration:** A5 in scratch repos; no external calls with restricted data.

---

## 2) System Architecture

**Core Components**

- **Planner:** Converts tickets → DAG of micro‑tasks (design, code, tests, docs, review, rollout).
- **Router:** Chooses best resource (premium LLM, code assistant, local model, tool) per task by policy and learned performance.
- **Scheduler:** Parallelizes micro‑tasks with constraints (repo locks, environment locks, dependency edges).
- **Workers:** Specialized executors (codegen, refactor, testgen, data‑migrate, infra‑plan, docgen, browser automation).
- **Budgeter:** Enforces cost/latency/token budgets and subscription quotas; performs dynamic reallocation.
- **Policy Gate:** OPA/Rego rules + allowlists; reason‑for‑access prompts on privileged actions.
- **Audit & Telemetry:** Structured logs, OTEL traces, token/cost meters, PR/test outcomes; immutable event store.
- **Secrets & Identity:** Short‑lived tokens; scoped credentials; per‑action identity.
- **Adapters:** Provider SDKs (premium LLMs, code tools, CI/CD, VCS, package registries, artifact stores).
- **UI/CLI:** Run console, diff viewer, approval queue, kill switch, replay.

**Storage**

- **Runs/Tasks/Events** in Postgres; **artifacts** in object storage; **feature/metrics** in columnar store; **embeddings/cache** in vector DB.

---

## 3) Parallelism & Work Decomposition

- **Ticket splitter:** Identify subtasks: _spec draft → code change → tests → docs → PR_.
- **DAG orchestration:** Topologically ordered; shard by repo/service; cap concurrency via weighted tokens (e.g., CPU-bound vs. I/O‑bound).
- **Locks:** Repo lock (merge), env lock (deploy), file‑path advisory locks to avoid collisions.
- **Straggler mitigation:** Duplicate long‑running tasks with hedging; adopt earliest success; cancel remainder.

---

## 4) Subscription & Resource Optimization

**Resource Types**

- **Premium LLM (Large Context + Tools):** For global reasoning, specing, multi‑file refactors.
- **Code‑Tuned LLM:** For function‑level codegen, testgen, lint‑fix, migration scripts.
- **Fast LLM:** For routing, summarization, triage, label generation.
- **Transcription/Vision OCR:** For video/doc assets in docs sites or UI tests.
- **Local Models (Ollama/gguf):** Privacy‑sensitive drafts, bulk summarization, dedupe.

**Routing Matrix (examples)**
| Task | Best Fit | Fallback | Notes |
|---|---|---|---|
| RFC/spec synthesis | Premium LLM | Fast LLM + retrieval | Max context; cache chunks |
| Unit test generation | Code‑Tuned LLM | Local | Provide signatures, branches, fixtures |
| Integration test scaffolding | Premium LLM | Code‑Tuned | Requires multi‑file context |
| Small bug fix | Code‑Tuned | Fast LLM | Token caps; assert‑first pattern |
| Lint/format | Tooling (linters) | — | Run locally; zero tokens |
| Infra/Terraform plan | Tool + Premium LLM (review) | — | “PLAN→APPLY” gated |
| Docs/Changelog | Fast LLM | Local | Style guide prompts |

**Budgeting**

- **Per‑run cap:** $$, tokens, wall‑time; hard‑stop with graceful summarize‑and‑hand‑off.
- **Per‑task quotas:** Max tokens/context; degrade to retrieval or local model beyond threshold.
- **Bandit learning:** Update model selection priors based on cost/quality/latency reward.
- **Memoization:** Cache specs, diffs, and test outputs keyed by repo SHA + prompt hash.

---

## 5) Prompting & Context Strategy

- **Context layers:** (1) Ticket + acceptance, (2) Relevant files (precise retrieval by path + AST symbols), (3) Constraints (style, perf, security), (4) Tool schema, (5) Expected diff format.
- **Granular prompts:** File‑scoped for codegen; module‑scoped for refactors; repo‑scoped only for planning.
- **Guarded outputs:** Require _diff‑only_ or _patch‑only_ outputs; reject free‑text for apply steps.
- **Determinism:** Fixed seeds / temperature for testgen; higher temperature for ideation.
- **Safety injection:** In every tool call, include policy summary and prohibited actions.

---

## 6) Web Automation (Agentic Browsing)

- **Driver:** Headless browser (e.g., Playwright) with policy‑aware allowlist; respect robots.txt & site ToS.
- **Capabilities:** Auth flows (service accounts), form filling, dashboard scraping for status, doc site extraction.
- **Protections:** Rate limiting, egress firewall, SSRF guards, no file:// loads, sandboxed user data dirs.
- **Artifacts:** Persist page snapshots (HTML, screenshots, HAR) for audit and re‑playability.

---

## 7) CI/CD & Environment Strategy

- **Pre‑merge:** Lint/typecheck → unit tests → integration tests (impacted services) → security scans.
- **Pre‑deploy:** Infra `plan` + diff comment → canary with SLO monitors → auto‑rollback if burn rate > threshold.
- **Ephemeral environments:** Per‑PR spin‑up; seeded datasets; recorded in run artifacts.
- **Feature flags:** All risky changes behind flags; staged rollouts.

---

## 8) Data & Schemas (Durability + Idempotency)

**Tables (Postgres)**

```sql
create table runs (
  id uuid primary key,
  goal text not null,
  autonomy int not null,
  mode text check (mode in ('PLAN','APPLY')) not null,
  status text not null,
  budget_tokens int,
  budget_usd numeric(10,2),
  created_at timestamptz default now()
);
create table tasks (
  id uuid primary key,
  run_id uuid references runs(id) on delete cascade,
  type text not null,
  params jsonb not null,
  status text not null,
  idempotency_key text unique,
  attempt int default 0,
  started_at timestamptz,
  finished_at timestamptz,
  error text
);
create table events (
  id bigserial primary key,
  run_id uuid,
  task_id uuid,
  ts timestamptz default now(),
  level text,
  message text,
  payload jsonb
);
create table budgets (
  run_id uuid references runs(id) on delete cascade,
  provider text,
  tokens_used int default 0,
  usd_spent numeric(10,2) default 0,
  primary key (run_id, provider)
);
```

---

## 9) APIs & CLI (Control Plane)

**REST (selected)**

- `POST /runs` → create (goal, autonomy, caps)
- `POST /runs/{id}/approve` → approve gated step
- `POST /runs/{id}/kill` → kill switch
- `GET  /runs/{id}` → status, budgets, artifacts
- `POST /tasks/{id}/retry` → manual retry

**CLI**

- `ab run --ticket ABC-123 --profile staging-aggressive --cap 200k-tokens --usd 50`
- `ab approve --run <id> --step apply`
- `ab kill --run <id>`

**Config (`ab.yml`)**

```yaml
autonomy_profile: prod-conservative
router:
  rules:
    - when: task == 'spec' and context_tokens > 60k
      use: premium
    - when: task == 'unittest'
      use: code_tuned
    - when: tokens_remaining < 10k
      use: local
budgets:
  per_run_usd: 100
  per_task_tokens: 16k
  wall_time_minutes: 120
safety:
  require_reason_for_access: true
  forbidden_patterns: ['DROP TABLE', 'exec(']
```

---

## 10) Tuning Knobs (Discrete Controls)

- **Autonomy per action:** {PLAN, GENERATE, EXECUTE, MERGE, DEPLOY}
- **Routing weights:** per model/tool (quality vs. cost vs. latency)
- **Context caps:** max tokens by task type
- **Temperature/seeds:** per task
- **Parallelism:** global concurrency; per‑repo and per‑service caps
- **Timeouts & budgets:** per task/provider; retry backoff
- **Safety level:** policy mode {deny‑by‑default | warn | allow}
- **Diff strictness:** patch‑only vs. patch+explanation
- **Deployment risk class:** auto‑merge rules, canary thresholds

---

## 11) Telemetry, KPIs & SLOs

- **Lead time (ticket→merge)**; **Change failure rate**; **MTTR**; **PR acceptance rate**; **Coverage Δ**.
- **Cost per merged PR**, **tokens per successful task**, **provider success rate**.
- **SLOs:** p95 plan latency < 5m; apply success ≥ 99%; rollback ≤ 10m; cache hit‑rate ≥ 40%.

---

## 12) Safety, Compliance, Governance

- **OPA/Rego** gates for WRITE/DEPLOY; **reason‑for‑access** logged.
- **Sandboxing:** containerized workers; seccomp; no root; egress allowlists; SSRF guards.
- **Secrets:** vault + short‑lived tokens; never include in prompts; redact logs.
- **Data minimization:** only send necessary context to providers; hashing for identifiers.
- **Audit:** immutable event store; signed artifacts; replay runnable.

---

## 13) Playbooks (End‑to‑End Flows)

**A) Implement Small Feature (API + UI)**

1. Planner drafts spec from ticket; router selects premium LLM for RFC; store RFC.
2. Codegen worker (code‑tuned LLM) writes API endpoint + unit tests.
3. UI worker drafts component + storybook; local model edits docs.
4. PR opened; CI runs; comments auto‑addressed up to cap; human reviews.
5. Auto‑merge if green and low risk; canary deploy; monitor; promote.

**B) Bug Fix**

- Triager uses fast LLM to localize; code‑tuned LLM writes patch + tests; auto‑merge if test‑only and trivial.

**C) Infra Change**

- Generate Terraform `plan`; human approval required; apply with rollback hooks; record drift snapshot.

---

## 14) Delivery Roadmap

**Phase 0 (Weeks 1–2): Foundations**

- Event store (runs/tasks/events), minimal planner, router v0 (rules), scheduler v0, workers (codegen, testgen), CLI v0, OPA skeleton, audit logging.

**Phase 1 (Weeks 3–6): Assisted Mode**

- PR creator, CI integration, ephemeral envs, cache/embeddings, budgeter v1, premium/local adapters, browser automation MVP, approval queue UI.

**Phase 2 (Weeks 7–12): Guarded Autonomy**

- Bandit router, canary deploys with SLO gates, rollback automation, policy‑based auto‑merge, discrete tuning UI.

**Phase 3 (Quarter 2): Full Autonomy in Safe Domains**

- A/B of routing strategies, self‑profiling prompts, drift detection, learning loops, multi‑repo coordination, sandbox hardening.

**Phase 4 (Quarter 3+): Scale & Flywheel**

- Cross‑program scheduling, marketplace of reusable actions, retrospective analytics, cost‑aware planning, reinforcement learning for task routing.

---

## 15) Test Strategy

- **Golden path** (spec→code→tests→PR→merge→deploy).
- **Crash/resume** mid‑run; idempotency asserts.
- **Policy denial** on unsafe diffs.
- **Routing evaluation** across providers (quality/cost/latency triad).
- **Web driver** robustness (auth, rate limits, snapshot correctness).
- **Rollback drills** monthly; chaos tasks (kill worker, network partition).

---

## 16) Risks & Mitigations

- **Over‑coupling to a single provider:** keep adapters thin; test fallbacks monthly.
- **Prompt injection/data leakage:** strict allowlists; sanitize inputs; no secrets in context.
- **Budget overrun:** hard caps; progressive backoff; local fallback.
- **Flaky tests:** quarantine; deflake pipeline; require deterministic seeds.

---

## 17) RACI & Roles

- **Owner (R/A):** Platform PM + Lead Engineer
- **Router/Budgeter (R):** ML Eng
- **Policy/Audit (R):** Security Eng
- **Workers (R):** Feature teams (per language)
- **SRE (C/R):** Deploy & rollback logic
- **QA (C):** Test frameworks & golden packs

---

## 18) Appendix

**A) Scheduler Pseudocode**

```python
def schedule(run):
    dag = planner.plan(run.goal)
    while not dag.done():
        ready = dag.ready_nodes()
        for task in ready:
            if capacity.available(task):
                worker = router.assign(task)
                submit(worker, task)
        results = await gather_results()
        for r in results:
            dag.mark(r.task, r.status)
            budgeter.update(r.cost)
            policy.audit(r)
```

**B) Provider Routing Policy (example)**

```yaml
rules:
  - when: task_type in ["spec","integration_refactor"] and context_tokens > 48k
    choose: premium
    budget: { max_tokens: 64k, max_usd: 8 }
  - when: task_type == "unit_test"
    choose: code_tuned
    budget: { max_tokens: 8k, max_usd: 1 }
  - when: tokens_spent_run > 80% cap
    choose: local
```

**C) Diff‑Only Output Contract**

```json
{
  "patch_format": "unified",
  "files": [{ "path": "src/foo.ts", "hunks": ["@@ -12,6 +12,7 @@ ..."] }]
}
```

**D) Browser Automation Guardrails**

- Respect ToS & robots.txt; throttle; annotate purpose in UA string.
- Block link‑local/meta IPs; deny file://; cap concurrent sessions.
- Store HAR + screenshot per action for audit.

**E) Cost & Token Accounting**

- Tokens and USD tracked per provider per task; wall‑time and cache hit ratio recorded; surface per‑ticket unit economics.

---

_End of roadmap. This document is meant to be executable: plug the schemas, configs, and policies directly into the operator implementation and iterate by phase._
