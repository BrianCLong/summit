# Orchestration Code Review — Semi‑Autonomous Build (v0)

_Scope: files inside `summit-main` from the provided archive. Focus on components named “orchestrator”, autonomy, DR, and web orchestration paths._

---

## Executive Summary

**Maturity:** Early alpha for autonomy. Several promising scaffolds (config, enhanced orchestrator with durability intent, web/DR stubs), but many placeholders and elisions (`...`) remain. For semi‑autonomous platform building, we must harden: (1) **durable, idempotent state machine**, (2) **policy & safety guardrails**, (3) **observability + audit**, (4) **offline approvals & kill‑switch**, (5) **sandboxing for actions**, and (6) **repeatable infra actions (plan/apply/rollback)**.

**Top findings (P0):**

- **Durability gaps:** `server/src/copilot/orchestrator.js` is stubbed; `orchestrator.enhanced.js` sketches persistence, resume, retries but core logic is elided. No confirmed **idempotency keys**, **outbox**, **resume from partial**.
- **Safety gaps:** Default autonomy set to `1` in `orchestration.yml`, tracing disabled, and no wired **OPA/policy** checks before taking actions. No **reason‑for‑access** prompts logged.
- **Action sandbox missing:** No isolation for code‑exec steps/tools; risk of RCE/SSRF via connectors or fetchers.
- **DR orchestrator** is a placeholder; lacks quiesce, snapshot verification, and signed artifacts.
- **Tests absent:** `tests/orchestrator/test_orchestrator.py` is a placeholder; no golden‑path or crash‑resume tests.

---

## Notable Artefacts & What They Imply

- **Config**: `orchestration.yml` — defines models, endpoints (`litellm`, `ollama`), autonomy level, triggers. Observability/tracing set `enabled: false`. ▶️ Good start, but move secrets to env; enable tracing in non‑prod; add **approval lanes**, **kill‑switch**, and **rate limits** per action.
- **Node Copilot Orchestrator**: `server/src/copilot/orchestrator.js` (stub) and `orchestrator.enhanced.js` (durability intent: Postgres store, idempotent tasks, Redis streams). ▶️ The enhanced version is the right direction; needs concrete **state machine**, **schema**, **idempotency**, and **outbox**.
- **Python Autonomous Orchestrator**: `ml/app/agents/autonomous_orchestrator.py` — defines `Task`, `AutonomousOrchestrator`, agent registry, threadpool, capabilities. ▶️ Lacks **cancellation**, **backpressure**, **policy hooks**, **deterministic modes**, and **resource caps**.
- **Web Orchestrator (UI)**: `apps/web/src/components/maestro/WebOrchestrator.tsx` — selects sources, runs synthesis, shows citations. ▶️ Needs **defensive rendering**, **error surfaces**, and server‑side authorization for orchestration requests.
- **GraphQL Web Orchestrator**: `services/web-orchestrator/src/resolvers.answer.ts` — naive bandit selection, publishes fetch jobs, synthesizes answers. ▶️ Add **license enforcement**, **budgeting**, **schema validation**, and **timeout/circuit breakers**.
- **DR Orchestrator**: `services/dr-orchestrator/src/index.ts` — basic endpoints only. ▶️ Implement quiesce/snapshot/verify/restore flow with artifact signing and progress events.
- **PsyOps Orchestrator**: `intelgraph_psyops_orchestrator.py` — Kafka consumer pipeline with IntelGraph clients. ▶️ Ensure **idempotent message handling**, **dead‑letter queues**, **metrics**, and **error categorization**.

---

## Threat & Safety Review (Semi‑Autonomous Context)

**Primary risks:**

1. **Unbounded actions** (deploy/modify systems) without human‑in‑the‑loop gates → add _Change Types_: `NOOP | PLAN | APPLY` with approvals.
2. **Prompt injection & model overreach** via GraphRAG and connectors → enforce _allowed tools_ whitelist and strict input sanitation.
3. **Supply‑chain & secrets leakage** via orchestration jobs → use ephemeral creds, short‑lived tokens, signed action bundles.
4. **RCE/SSRF** through fetchers and user‑provided URLs/paths → sandbox network egress, validate URLs, restrict file access.
5. **Data poisoning** from ingested sources → quarantine and triage with provenance.

**Controls to add (P0):** OPA/Rego or equivalent policy engine; reason‑for‑access prompts; per‑action budgets; dry‑run previews; manual approval queue; structured audit logs with correlation IDs.

---

## Reliability & Observability Gaps

- **No durable run/task/event store** wired end‑to‑end; add Postgres tables + outbox pattern, Redis streams optional.
- **Tracing disabled** in config; enable OTEL tracing for orchestrated actions; tag spans with `run_id`, `task_id`, `action`, `resource`.
- **SLOs:** define orchestration SLOs (plan latency, apply success rate, MTTR via resume).

---

## Architecture: What “Good” Looks Like

**State model (Run → Plan → Apply → Verify):**

- `RUN{ id, goal, mode: PLAN|APPLY, status, autonomy, approval }`
- `TASK{ id, run_id, type, params, status, attempt, idempotency_key }`
- `EVENT{ id, run_id, task_id, level, message, payload }`
- `LOCK{ resource, run_id, task_id }` (advisory locks)

**Action Contract (all actions abide):**

```ts
export interface Action {
  name: string;
  version: string; // semver
  safety: {
    category: 'READ' | 'WRITE' | 'DEPLOY' | 'ROLLBACK';
    requiresApproval?: boolean;
    budgets: { timeMs: number; network: 'none' | 'internal' | 'internet' };
  };
  validate(input: unknown): Result<Ok, Err>;
  plan(input: Ok): Promise<Plan>; // no side effects
  apply(plan: Plan, ctx: Ctx): Promise<Outcome>; // idempotent
  rollback(outcome: Outcome, ctx: Ctx): Promise<void>;
}
```

**Safety Envelope:**

- `OPA.evaluate(action, subject, resource, context)` gates `plan/apply`.
- `reason_for_access` captured on privileged actions; stored with event.
- Kill switch toggles autonomy → `0` immediately via `.orchestra.env` or admin API.

---

## Concrete Fixes & Patches

### 1) Persistence & Idempotency (Node)

**New tables (Postgres):**

```sql
create table runs(
  id uuid primary key,
  goal text not null,
  mode text check (mode in ('PLAN','APPLY')) not null,
  status text not null,
  autonomy int not null,
  created_at timestamptz default now(),
  started_at timestamptz,
  finished_at timestamptz
);
create table tasks(
  id uuid primary key,
  run_id uuid references runs(id) on delete cascade,
  type text not null,
  params jsonb not null,
  status text not null,
  attempt int default 0,
  idempotency_key text unique,
  started_at timestamptz,
  finished_at timestamptz,
  error text
);
create table events(
  id bigserial primary key,
  run_id uuid,
  task_id uuid,
  ts timestamptz default now(),
  level text,
  message text,
  payload jsonb
);
```

**Idempotent execution wrapper:**

```js
async function executeTask(task, store) {
  const key = hash(`${task.type}:${stableStringify(task.params)}`);
  const existing = await store.findTaskByKey(key);
  if (existing && existing.status === 'succeeded') return existing.outcome;
  if (existing && existing.status === 'running')
    throw new Error('Duplicate in-flight');
  await store.claimTask(task.id, key); // row lock + set running
  try {
    const plan = await actions[task.type].plan(task.params);
    await policy.enforce('plan', task, plan);
    const outcome = await actions[task.type].apply(plan, ctx);
    await store.completeTask(task.id, outcome);
    return outcome;
  } catch (e) {
    await store.failTask(task.id, serializeErr(e));
    throw e;
  }
}
```

### 2) Policy & Safety (Node/Python)

**OPA hook (pseudo):**

```ts
const decision = await opa.evaluate('orchestrator/allow', {
  subject,
  action,
  resource,
  context,
});
if (!decision.allow) throw new Error('PolicyDenied');
```

**Reason‑for‑access:** add to `events` and `runs` metadata; require prompt when `category in ['WRITE','DEPLOY']`.

### 3) Sandbox & Network Guard

- Run actions in **Firecracker/docker** with seccomp/app‑armor, readonly FS, no root, constrained egress.
- URL allowlist + SSRF guard for fetch actions; reject `file://`, link‑local, metadata IPs by default.

### 4) DR Orchestrator

Implement quiesce→snapshot→verify→store→restore pipeline:

```ts
POST /dr/backup  -> returns { snapshotId, sha256, location }
GET  /dr/status/:id -> { progress, verified }
POST /dr/restore -> { jobId } // streams events: STAGED→APPLYING→VALIDATING→COMPLETE
```

- Quiesce DBs, freeze writes, take logical + storage snapshot, calculate SHA256, sign manifest, upload to versioned bucket.
- On restore, validate checksums, run smoke tests, only then flip traffic.

### 5) `orchestration.yml` Guardrails

- `autonomy: 0` in prod; wire `.orchestra.env` overrides.
- `tracing.enabled: true`, `correlation_id: true`.
- Per‑action budgets + rate limits; `kill_switch: 1` honored by server on read.

### 6) Python `AutonomousOrchestrator`

- Add cooperative **cancellation** and **backpressure**.
- Deterministic mode with fixed seeds; **resource caps** (timeout, memory via subprocess limits) around tool calls.
- Plug **policy** into `execute_task` decorator; emit structured events to the same Postgres store (or Kafka topic).

---

## Tests You Need (start with these)

1. **Golden Path**: goal → plan → apply → verify; asserts events, states, citations recorded.
2. **Crash/Resume**: kill orchestrator mid‑run; process resumes from last succeeded task.
3. **Idempotency**: replay same run; ensures no duplicate side effects.
4. **Policy Denial**: attempt forbidden action; expect `PolicyDenied`, no side effects.
5. **SSRF Guard**: malicious URL rejected.
6. **DR Backup/Restore**: produces signed artifact; restore validates and flips traffic.

---

## Backlog (Prioritized)

**P0 (this week)**

- Implement Postgres store + idempotency + outbox; wire `orchestrator.enhanced.js` fully.
- Add OPA/policy checks + reason‑for‑access to privileged actions.
- Enable OTEL tracing + structured logs; honor `kill_switch`.
- Harden `resolvers.answer.ts` with license/budget enforcement and URL/input validation.

**P1 (next 2–3 weeks)**

- DR orchestrator full flow; crash/resume + load tests.
- Action sandbox + egress policy; audit redaction.
- Python orchestrator: cancellation/backpressure; shared event schema.

**P2 (this quarter)**

- Human‑in‑the‑loop console (approve/diff/rollback); simulations of plans; deception detection for prompt injection.

---

## Quick Wins

- Flip `tracing.enabled` to `true` in `orchestration.yml`; add per‑action budgets.
- Add `reason_for_access` prompt for any write/deploy action now.
- Create the three Postgres tables and use them from both Node and Python paths to unify run history.

---

_End of review (v0). Ping me when you want diffs applied to specific files; I’ll ship patch sets next._
