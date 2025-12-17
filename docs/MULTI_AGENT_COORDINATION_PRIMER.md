# Multi-Agent Coordination Primer for Summit

This guide captures durable motifs for coordinating autonomous agents and shows how to wire them into Summit workflows with governance and fast-start templates.

## Six core motifs

### Supervisor → Worker chains
- **Shape**: A single planner decomposes work into steps and dispatches to specialists; workers report progress and metrics.
- **Best for**: Predictable pipelines (CI/CD, lint → build → test → package) and runbook-style chores.
- **Summit application**: Drive `ci-lint-and-unit` and `ci-golden-path` stages via a planner agent that sequences repo tasks, reusing worker agents tuned for pnpm/tsc/jest.

### Critic–Proposer loops
- **Shape**: One agent drafts, another red-teams or scores; iterate until a stop condition is met.
- **Best for**: Pull-request hardening, threat modeling, policy drafting, prompt reviews.
- **Summit application**: Codex proposes diffs, Jules critiques for OPA/SLSA compliance and test confidence before PR creation.

### Auction / Bidding (Contract Net)
- **Shape**: A manager broadcasts a task; agents bid with cost/ETA/fit; the lowest total risk wins.
- **Best for**: Tasks where skills or availability differ (e.g., TypeScript vs. Rust vs. infra).
- **Summit application**: Decide which agent tackles `packages/liquid-nano` versus `services/authz-gateway` based on build flakiness history and toolchains.

### Blackboard (Shared Scratchpad)
- **Shape**: Agents post partial results to shared state; others pick up, refine, and merge.
- **Best for**: Multi-stage analysis (SBOM → SLSA → OPA), data fusion, provenance stitching.
- **Summit application**: Central “Provenance Explorer” topic that aggregates SBOMs, SLSA attestations, and OPA policy checks for downstream dashboards.

### Federated negotiation graphs
- **Shape**: Work is a DAG; each node is negotiated (interfaces, SLAs, test vectors) before execution.
- **Best for**: Cross-cutting features (security + UX + analytics) that need explicit boundaries.
- **Summit application**: Enforce contracts across `intelgraph-server`, `Provenance Explorer UI`, and `Invariant Engine` via interface files in `contracts/` with versioned test vectors.

### Arbitered contests (tournament/best-of-N)
- **Shape**: Multiple agents attempt the same task; an arbiter scores and selects or blends outputs.
- **Best for**: High-stakes prompts, speculative refactors, or flaky tests.
- **Summit application**: Run k=3 speculative fixes on flaky suites; arbiter scores test pass rate, perf delta, and policy compliance before merge.

## Minimal control APIs
Use the sample task spec and motif blocks in `tasks/multi-agent-ci-example.yaml` as a drop-in template:

- **Task spec**: Declares goal, constraints, metrics, artifacts, and policy references required for every run.
- **Supervisor/worker**: Defines the execution plan and worker skill map (pnpm, tsc, jest/vitest).
- **Critic–proposer**: Configures proposer/critic pair and stop conditions.
- **Auction**: Outlines bid fields and risk-aware award function.
- **Blackboard**: Points to shared state (Redis) with topics for SBOM, SLSA, OPA, and CI telemetry.
- **Negotiation graph**: Lists contract nodes and required edge fields (interface, SLA, version, owner, test vectors).
- **Contest**: Chooses k participants, arbiter, and blending strategy.

## Governance defaults
- Every task must declare metrics and policy references.
- Every agent emits `decision_log.json` (inputs, plan, tries, deltas, metrics, exit status).
- Every motif defines a `stop_when` condition to prevent infinite loops.
- The arbiter owns merge decisions and the revert plan.

## Fast-start checklist
1. Add `tasks/` YAML specs to CI (see `tasks/multi-agent-ci-example.yaml`).
2. Stand up a lightweight blackboard (Redis/Postgres) implementing `post/subscribe/merge` for SBOM → SLSA → OPA topics.
3. Gate PRs with critic–proposer: Codex proposes, Jules critiques, auto-amend, then enforce OPA.
4. Run flaky areas in contest mode (k=3) with arbiter scoring tests, performance deltas, and policy adherence.
5. Maintain negotiation graph contracts under `contracts/` with interface files and test vectors.
6. Surface `artifacts/decision_log.json` in Provenance Explorer for auditability.
