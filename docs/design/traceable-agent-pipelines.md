# Traceable Agent Pipelines (TPC + ARL)

## Goals

Create verifiable, replayable multi-agent pipelines that capture stagewise accountability, prevent silent error cascades, and expose accuracy–cost–latency tradeoffs aligned to governance and safety requirements.

## Traceable Pipeline Contract (TPC)

Each agent step must emit a structured JSON artifact validated against a JSON Schema (to be codified under `schemas/agent/tpc.schema.json`):

```json
{
  "role": "Planner | Executor | Critic | Reviewer | Router",
  "goal": "string",
  "input_refs": ["input://path-or-hash"],
  "assumptions": ["explicit assumption"],
  "constraints": ["time<=60s", "no-write-to-prod"],
  "actions": ["summarize requirements", "generate code"],
  "outputs": { "summary": "...", "artifacts": ["sha256:..."] },
  "diffs": ["git-style diff chunks"],
  "tests_run": ["npm test -- ledger"],
  "confidence": 0.0,
  "risks": ["potential perf regression"],
  "cost_est": { "prompt_tokens": 1200, "compute_usd_est": 0.02 },
  "latency_est": { "p50_ms": 800, "p95_ms": 1500 },
  "required_validations": ["schema-validation", "security-scan"],
  "handoff_envelope": {
    "assumptions": ["..."],
    "constraints": ["..."],
    "required_validations": ["..."],
    "minimal_diff": "patch representation"
  }
}
```

### Handoff Envelope

- **Assumptions**: Preconditions the next role must honor (e.g., "db schema frozen").
- **Constraints**: Prohibited actions/resources and scope boundaries.
- **Required validations**: Tests/analyses that must run before accepting output.
- **Minimal diff**: Smallest patch summary so the next role can reason about change scope.
- **Validation**: Envelope presence is mandatory; validation fails if missing fields or empty sets.

## Agent Run Ledger (ARL)

Immutable event log per run capturing provenance and replay data. Schema target (`schemas/agent/arl.schema.json`):

- `run_id` (uuid), `step_id`, `parent_step_id`
- `role`, `timestamp_start`, `timestamp_end`, `duration_ms`
- `artifact_hash` (sha256 of TPC artifact) + optional payload pointer
- `status` (`success|error|skipped|gated`), `error_origin` (step_id or null)
- `cost_est`, `latency_ms` (actual), `validations` (ran/pending/failed)
- `storage` (sink: console|file|db)

Ledger invariants:

- Append-only; hashes computed before write; tamper checksums per run.
- Parent-child links enable blame lineage and replay.
- Minimal retention: enough to reconstruct inputs/outputs via hashes + payload refs.

## Blame / Repair / Harm Metrics

- **repair_rate**: repaired_steps / total_failed_steps (per role + overall).
- **harm_rate**: harmful_outputs / total_outputs, where harmful outputs violate constraints or introduce regressions.
- **unresolved_origin(role)**: count of failures without attributed origin for that role.
- **cost_per_step / latency_per_step**: aggregated by role and pipeline type.
- **SLO guardrails**: alert if harm_rate > 0 or unresolved_origin > 0 for critical pipelines.

## Governance & Safety

- **Policy Gate**: If a step requests write access, touches security-sensitive files, or proposes execution of untrusted code, mark status=`gated` and require human approval before proceeding.
- **Redaction Rules**: Strip tokens/secrets/PII from prompts/logs before ledger write; store hashes when redaction occurs and annotate `redaction_reason`.
- **Least-privilege**: Roles receive minimal scopes (read-only until gate lifted); ledger records scope granted.
- **Human Oversight**: CODEOWNERS approval required for gated actions; ARL must store approver identity and timestamp.

## Operational Flow

1. Planner emits plan TPC + envelope; ledger writes step with artifact hash.
2. Executor validates incoming envelope, runs required validations/tests, produces outputs/diffs/tests_run, and writes ledger entry with actual latency/cost.
3. Critic cross-checks outputs, compares against envelope constraints, and can emit `error_origin` for blame; updates repair/harm counters.
4. Router/Recommender consumes ledger metrics to route future tasks (e.g., prefer faster executor when cost SLO threatened).

## Validation & Observability

- **Runtime validation**: Schemas enforced via middleware; pipeline aborts if TPC or envelope invalid.
- **Metrics hooks**: Increment counters for steps, gate triggers, redactions; histogram latency/cost; export to existing telemetry sink.
- **Replay tooling**: CLI to reconstruct steps using `run_id` and artifact hashes; verify checksums.
- **Evidence generation**: Each run emits `artifacts/agent-runs/{run_id}.json` plus integrity hash.

## Acceptance Tests (to guide implementation)

- Schema unit tests for TPC and ARL (valid/invalid fixtures).
- Integration test: simulate Planner→Executor→Critic with injected error; ledger must attribute `error_origin` to the executor step and emit repair attempt.
- Governance test: attempt sensitive file write; pipeline should be `gated` until human approval flag set.
