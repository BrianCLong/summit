# AI Engineering Infrastructure Strategy

**Date:** 2026-03-07
**Status:** Strategic planning document
**Horizon:** 2026–2030

---

## 1. Thesis

The software industry is transitioning through three phases:

```
AI coding assistants (autocomplete)
  → AI engineering agents (autonomous task completion)
    → AI engineering infrastructure (orchestration control plane)
```

The third phase — infrastructure — is the unclaimed category. No current platform provides:

- policy-governed multi-agent coordination
- deterministic, replayable engineering evidence
- vendor-neutral agent orchestration
- engineering task graph management

This is Summit's strategic opening. Summit already provides the foundational primitives (Maestro orchestration, OPA policy, Switchboard HITL, provenance ledger) for intelligence operations. The extension to software engineering is an application of existing infrastructure, not a new product.

---

## 2. Positioning

### Current Summit claim (intelligence operations):
> Multi-agent orchestration for autonomous research and intelligence analysis.

### Extended Summit claim (AI engineering infrastructure):
> Policy-governed orchestration for AI engineering agents — with deterministic evidence, human-in-the-loop review, and vendor-neutral agent coordination.

### Analogy:
| Era | Platform |
|---|---|
| Virtual machines → containers | Docker |
| Containers → orchestration | Kubernetes |
| AI coding agents → orchestration | Summit |

Summit should own the orchestration layer, not compete in the agent layer.

---

## 3. The 7 Core Subsystems

Every AI engineering operating system must implement these primitives. Summit's current implementation status is noted.

### 3.1 Desired State Compiler
Accepts a goal (issue, feature spec, security finding) and produces a normalized objective with constraints.

**Summit status:** Partially implemented — Maestro task submission. Gap: structured goal schema for software engineering tasks.

**Extension path:** Add `CodingTask` type to Maestro task schema with fields: `repo`, `issue_ref`, `constraints`, `evidence_requirements`.

### 3.2 Engineering Task Graph Engine
Compiles objectives into a dependency DAG with typed nodes, retry policy, and evidence requirements.

**Summit status:** Maestro handles sequential and parallel agent flows. Gap: explicit DAG representation with typed engineering nodes (plan, code, test, security-review, document).

**Extension path:** Extend Maestro's orchestration schema with a `TaskGraph` type that supports:
```yaml
nodes:
  - id: plan
    kind: planner
    deps: []
  - id: implement
    kind: coder
    deps: [plan]
  - id: test
    kind: tester
    deps: [implement]
  - id: security-review
    kind: security-agent
    deps: [implement]
```

### 3.3 Distributed Agent Scheduler
Handles task queuing, priority, leases, retries, and tenant fairness at scale.

**Summit status:** Maestro handles task routing. Gap: distributed lease-based scheduling for high concurrency.

**Extension path:** For scale, extend Maestro scheduler with Redis-backed lease queues and shard-by-repo routing.

### 3.4 Sandbox Runtime Manager
Creates isolated execution contexts with repo snapshotting, bounded network/secrets, and resource caps.

**Summit status:** `Dockerfile.sandbox`, `docker-compose.sandbox.yml`, `SECURITY/sandbox-mode.md` exist. Gap: per-task sandbox lifecycle management with evidence capture.

**Extension path:** Wrap sandbox containers with task-scoped lifecycle controller that:
1. Snapshots repo state (records commit SHA in stamp.json)
2. Launches isolated container
3. Executes agent task
4. Captures evidence bundle
5. Tears down container

### 3.5 Evidence & Replay System
Produces deterministic artifacts for every agent run. Enables exact replay.

**Summit status:** `evidence/` directory, provenance ledger exist. Gap: standardized per-run bundle schema.

**Canonical schema:**
```
evidence/<run_id>/
  report.json          # structured outcome: status, summary, agent_id, run_id
  metrics.json         # duration, token cost, memory, retry count
  stamp.json           # repo_sha, policy_version, agent_version, timestamp
  terminal.log         # raw command output
  test_results.json    # structured pass/fail per test
  patch.diff           # generated code changes
  task_graph.json      # the DAG that was executed
  agent_trace.jsonl    # per-agent action log (append-only)
```

All files must have stable field ordering for deterministic hashing.

### 3.6 Policy / Verification Plane
Enforces OPA rules, required checks, vulnerability thresholds, and release-readiness gates.

**Summit status:** OPA in `.opa/policy/`, merge policy in `SECURITY/SECURITY_MERGE_POLICY.yml`, required checks documented. This is Summit's strongest subsystem relative to competitors.

**Extension path:** Add `coding-agent` policy lane to existing OPA config:
- deny dependency changes without explicit allowance
- deny secret access by default
- require evidence bundle before merge gate passes
- enforce maximum task runtime

### 3.7 Audit / Drift / Operations Plane
Tracks event journal, behavioral drift over time, and SLO compliance.

**Summit status:** `audit/` directory, drift detection (`drift_report.json`, `trend_metrics.json`). Gap: agent-specific drift metrics for coding tasks.

**Extension path:** Add coding-agent metrics to drift detector:
- task success rate by agent type
- patch quality metrics (test pass rate, lint pass rate)
- reasoning drift (deviation from expected output distribution)

---

## 4. The "GitHub Actions for AI Engineers" Feature

The single feature most likely to drive developer adoption is a **portable workflow spec**:

### File: `.summit/workflow.yaml`

```yaml
# .summit/workflow.yaml
version: "1.0"
goal: "implement-feature"

constraints:
  max_runtime: 30m
  allowed_agents: [planner, coder, tester]
  network: restricted
  secrets: none

tasks:
  - id: plan
    agent: planner
    action: design_solution
    evidence_required: [plan.md]

  - id: implement
    agent: coder
    action: write_code
    deps: [plan]
    evidence_required: [patch.diff, test_results.json]

  - id: test
    agent: tester
    action: run_tests
    deps: [implement]
    evidence_required: [test_results.json]

gates:
  - tests_pass: true
  - policy_verdict: allow
  - evidence_complete: true
```

### Command: `summit run`

```bash
summit run issue 123
# or
summit run .summit/workflow.yaml
```

This compresses the orchestration workflow into one developer primitive, analogous to:
- `docker run` (Docker)
- `kubectl apply` (Kubernetes)
- GitHub Actions `workflow_dispatch`

---

## 5. Competitive Moats

### Moat 1 — Policy-as-Code Agent Governance
OPA enforcement is Summit's clearest differentiator. No other coding agent platform has explicit, auditable policy gates. Enterprise customers will require this for compliance.

### Moat 2 — Evidence-Based Engineering
If Summit's evidence bundle becomes the audit trail for AI-generated code, organizations cannot easily abandon the system that stores their compliance records. This is a strong retention mechanism.

### Moat 3 — Vendor-Neutral Orchestration
Support for OpenAI, Anthropic, and open-source agents (via `AgentRuntime` interface) prevents vendor lock-in and makes Summit the neutral coordination layer — the same role Kubernetes plays for containers.

### Moat 4 — Replayable Runs
`summit replay <run_id>` recreates the exact repo state, agent actions, and evidence. This is unique in the market and solves a critical trust problem: developers can verify what an AI agent did and why.

### Moat 5 — Engineering Task Graphs
Representing engineering work as a typed DAG enables workflow sharing (Summit Workflow Hub), reuse, and optimization that flat script runners cannot match.

---

## 6. What Summit Should NOT Build

### Do not build a proprietary coding agent
Building a Summit-branded coding agent would:
- Compete with OpenAI, Anthropic, Cognition (Devin)
- Destroy ecosystem neutrality
- Signal to agent providers that Summit is a competitor, not infrastructure

### Do not build an IDE plugin
- Competes with Cursor, Windsurf
- Wrong trust boundary (workstation vs cloud)
- Dilutes infrastructure positioning

### Do not hard-code agent behavior
- All agent logic should be pluggable via `AgentRuntime` interface
- Summit orchestrates; agents execute

---

## 7. Adoption Strategy

### Phase 1 — Developer Adoption (Months 1–3)
- Open source the core orchestration primitives
- Ship `summit run` CLI
- GitHub integration (issue → agent → PR workflow)
- Publish evidence bundle schema as open standard

### Phase 2 — Ecosystem Expansion (Months 3–6)
- Plugin architecture for external agents
- Workflow registry (community workflows)
- Integrations: GitHub, GitLab, CI systems

### Phase 3 — Enterprise Infrastructure (Months 6–12)
- Enterprise policy governance (SOC 2, ISO 27001 alignment)
- Compliance audit logs
- Multi-tenant agent pools
- SLA monitoring and runbooks

---

## 8. Risk Analysis

| Risk | Likelihood | Mitigation |
|---|---|---|
| OpenAI bundles orchestration into Codex platform | Medium | Build open standards before they close ecosystem |
| GitHub integrates native AI engineering orchestration | Medium | Deep GitHub integration first; become the default |
| Ecosystem prefers single-vendor solutions | Low | Developer adoption must precede enterprise sales |
| Summit pivot to product competes with agent providers | High (internal risk) | Explicit policy: Summit is infrastructure, not an agent |

---

## 9. Success Metrics

| Metric | 6-month target | 12-month target |
|---|---|---|
| Community workflows published | 50 | 500 |
| Agent plugins | 10 | 100 |
| GitHub issues processed via Summit | 100 | 10,000 |
| Evidence bundles generated | 500 | 50,000 |
| Policy violations caught | tracked | tracked |

---

## 10. References

- `docs/CODEX_SECURITY_ANALYSIS.md`
- `docs/AI_CODING_AGENT_LANDSCAPE.md`
- `docs/AGENT_OVERVIEW.md`
- `ROADMAP.md`
- `SECURITY/sandbox-mode.md`
- `.opa/policy/`
- `SECURITY/SECURITY_MERGE_POLICY.yml`
- `audit/`
- `evidence/`
