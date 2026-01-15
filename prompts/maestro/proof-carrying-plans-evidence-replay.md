# Proof-carrying Plans + Evidence Bundle + Deterministic Replay (MVP)

You are Codex operating in the BrianCLong/summit monorepo.

Mission (PR-atomic)
Add a minimal but real “Proof-carrying Plan” substrate:

1. a typed Plan IR
2. Action Contracts for tool calls
3. an Evidence Bundle emitted for every run
4. a deterministic (or bounded-stochastic) Replay harness

Non-negotiables

- Do NOT commit to main; create a new branch: feat/proof-carrying-plans-evidence-replay
- Keep dependencies light (prefer existing libs; if new, justify).
- Determinism: replays must produce the same Evidence Bundle structure and the same step decisions given identical inputs & tool mocks.
- No chain-of-thought logging. Logs must be operational, not private reasoning.

Repo discovery (do this first)

- Locate where “runs” / “actions” / “tool execution” are implemented (likely in Maestro/CLI orchestration).
- Identify existing logging/audit or “event trail” facilities; extend rather than invent.

Implementation requirements
A) Plan IR (minimal)

- Add a small typed schema (TS or JSON schema) for:
  - plan_id, run_id, goal
  - steps[]: step_id, name, tool_name (optional), args_schema_ref, preconditions[], postconditions[], permissions[], cost_bounds (optional), retry_policy (optional)
- Store as JSON in the Evidence Bundle.

B) Action Contracts

- Define a contract registry for tools:
  - tool_name
  - args_schema (json schema or zod)
  - postcondition check (function) that can be evaluated against tool output
  - redaction rules for sensitive fields
- Enforce validation:
  - before tool call: args validated
  - after tool call: output validated + postconditions checked (best-effort; failing postconditions produces a structured failure event, not a crash unless configured “strict”)

C) Evidence Bundle (required output artifact)

- For each run, emit a bundle directory with:
  - plan.json (Plan IR)
  - trace.ndjson (append-only step/tool events)
  - artifacts/ (any generated files references)
  - manifest.json (hashes, timestamps, versions, git sha, config flags)
- Redact secrets/PII via contract rules before writing to disk.

D) Deterministic Replay Harness

- Add a CLI command or subcommand:
  - `... replay --bundle <path> [--strict]`
- Replay uses:
  - plan.json + trace events
  - tool mocks recorded in trace OR deterministic stubs (configurable)
- Output:
  - replays a new trace and asserts equivalence of:
    - event sequence (types + step ids + tool names)
    - validated schemas
    - manifest structure
  - on mismatch, produce a human-readable diff report.

Testing (must-have)

- Unit tests:
  - Plan IR serialization
  - contract validation pre/post
  - evidence bundle manifest hashing stable
- Integration test:
  - run a small sample workflow with mocked tools → produce bundle → replay → pass equivalence checks
- CI must pass.

Acceptance criteria

- A run produces a complete Evidence Bundle by default (or behind a single config flag if you must, but default-on is preferred).
- Replay works locally with a sample bundle committed under test fixtures (or generated in test).
- Failure modes are clear and actionable: schema mismatch, postcondition fail, redaction errors.

Deliverable

- 1 PR with:
  - new Plan IR types + docs
  - tool contract registry + enforcement
  - Evidence Bundle writer + manifest + hashing
  - replay command + diff report
  - tests + minimal documentation (README section)
