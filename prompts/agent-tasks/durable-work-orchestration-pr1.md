You are implementing a Gastown-inspired “Durable Work Orchestration” layer inside the Summit repo.

Mission

- Extract the highest-leverage ideas from steveyegge/gastown and adapt them to Summit’s architecture (NOT a clone).
- Build a minimal, shippable MVP that makes Summit’s multi-agent work resilient to context loss, restarts, and parallel swarms.

Core concepts to adapt (translate into Summit terms)

1. Durable work graph (Beads-like): tasks as structured objects with IDs, status, assignee, dependencies, and events; queryable and resumable across sessions.
2. Agent identity + Hook: each agent has a persistent identity and a “hook” (queue) of assigned work; on startup the agent MUST check hook and resume.
3. Convoys: every “unit of delivery” is wrapped in a convoy object that tracks a bundle of tasks (not necessarily parent/child), with a dashboard view.
4. Formulas → Molecules: workflow templates (“formulas”) compile into executable step-chains (“molecules”) with explicit needs/depends; each step has acceptance criteria; agents close steps one-by-one.
5. Roles that scale:
   - Mayor-like coordinator (planner/dispatcher)
   - Witness-like monitor (stuck detection, nudges)
   - Refinery-like merge queue operator (serializes merges, rebases, CI waits)
   - Deacon-like heartbeat/daemon (periodic patrols + wakeups)
6. Ephemeral orchestration runs (“wisps”): orchestration steps/events should not spam the durable ledger; keep ephemeral run logs and optionally squash to a digest.

Constraints (match Summit operating discipline)

- Atomic PRs only (one prompt/roadmap item per PR).
- No regressions: tests, lint, typecheck green; add targeted tests.
- Cost/velocity guardrails: avoid infinite loops; hard caps on retries; exponential backoff for patrols.
- Security/governance: all automation actions must be policy-gated (OPA checks) and auditable.

Deliverables (in this order)
A) Design doc (docs/architecture/durable-work-orchestration.md)

- Data model: Task, Convoy, AgentIdentity, Hook, Molecule, Formula, Event, RunDigest (wisp summary)
- State machine: statuses, transitions, idempotency strategy, retry semantics
- Interfaces: API/SDK + CLI commands
- Observability: event stream, metrics (queue depth, lead time, retry counts), audit log shape
- Risk register + mitigations (merge conflicts, CI flakiness, runaway agents, partial failure)

B) MVP Implementation (minimal but real)

1. Storage:
   - Implement durable work graph in Summit’s existing persistence layer (prefer Postgres + IDs; optionally mirror into Neo4j for dependency traversal if Summit already uses it).
   - Provide deterministic IDs with collision resistance.
2. APIs:
   - CRUD for tasks + dependencies
   - Convoy create/list/status (rollup progress)
   - Hook operations: assign, claim, requeue, unassign
   - Molecule execution: next-step discovery; step close; resume pointer
   - Formula compiler: template → protomolecule → molecule instance w/ variables
3. Orchestration loop (“patrols”):
   - Witness patrol: detect stuck/failed tasks, nudge, reassign, summarize
   - Refinery patrol: merge queue serialization; wait for CI; rebase; escalate on conflict
   - Deacon patrol: heartbeat / wake signal propagation
4. UI/CLI:
   - CLI: summit work task|convoy|hook|formula|molecule commands (or equivalent)
   - Minimal dashboard endpoint(s): convoys + active hooks + recent events

C) Tests & evidence

- Unit tests for state machine + dependency resolution + formula compilation
- Integration tests for “resume after restart” and “convoy completes”
- A short runbook: how to use this with Summit agents (AGENTS.md additions)

Acceptance criteria

- Demonstrate: start a convoy from a formula, sling/assign to an agent hook, complete steps, “restart” the agent, and it continues from the correct step.
- Demonstrate: Refinery merge queue processes 2 PRs serially with CI waits.
- Demonstrate: Witness detects a stuck task and nudges/reassigns within policy.
- All new functionality is behind feature flags if needed, with safe defaults off.

Execution plan (required output)

- Produce a PR-by-PR breakdown (atomic) with file lists and commit messages.
- For PR1, implement only the design doc + minimal schemas/interfaces.
- For each PR: include tests and a small demo script or markdown snippet.

Start now:

1. Inspect Summit repo structure quickly (where persistence, APIs, CLI live).
2. Draft the design doc with the data model + state machine.
3. Propose PR1 contents (exact file paths) and then implement PR1.
