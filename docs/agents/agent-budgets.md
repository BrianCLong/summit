# Agent Budget & Economics System

**Owner:** Platform Engineering (Agent Economics)
**Status:** DRAFT
**Version:** 1.0

## 1. Executive Summary

Summit operates a diverse fleet of autonomous agents, ranging from simple analysis scripts to recursive, high-privilege governance agents. To ensure platform sustainability, cost predictability, and operational safety, we enforce a strict **Budget and Risk Control System**.

**Core Philosophy:**

- **No Unbounded Execution:** Every agent run has a finite budget for tokens, time, and side-effects.
- **Risk-Aware Limits:** High-risk agents (those touching sensitive data or infrastructure) operate under stricter economic and oversight constraints.
- **Deterministic Enforcement:** Budgets are enforced via CI/CD pipelines and runtime hooks, not post-hoc billing analysis.

This framework ensures that a "rogue" or buggy agent cannot drain API quotas, saturate compute resources, or perform unauthorized recursive expansions.

---

## 2. Budget Dimensions (Canonical)

Summit tracks usage across five orthogonal dimensions. These are measured **per agent run**, attributable to a specific **Tenant** and **Release**.

| Dimension          | Metric               | Unit          | Description                                                                         |
| :----------------- | :------------------- | :------------ | :---------------------------------------------------------------------------------- |
| **Token Usage**    | `tokens.total`       | Int (Count)   | Sum of input (prompt) and output (completion) tokens across all model calls.        |
| **Runtime**        | `execution.duration` | Seconds       | Wall-clock time from invocation to final status report.                             |
| **Fan-out**        | `tasks.created`      | Int (Count)   | Number of sub-tasks or recursive agents spawned. Limits exponential expansion.      |
| **External Calls** | `io.external_calls`  | Int (Count)   | HTTP requests to non-Summit APIs (e.g., search, enrichment, third-party tools).     |
| **Risk Score**     | `risk.cumulative`    | Float (0-100) | Composite score derived from files touched, secrets accessed, and permission tiers. |

**Note:** "Cost" in dollars is a derived metric, not a control primitive. We control the _drivers_ of cost (tokens, compute), not the currency itself.

---

## 3. Agent Budget Classes

Agents are assigned a **Budget Class** based on their function, trust level, and expected impact. This class determines their default hard and soft limits.

### Class Definitions

#### Tier-0: Analysis & Read-Only (The "Drone" Class)

- **Scope:** CI checks, linting assistants, read-only graph queries.
- **Risk Profile:** Low. No side effects.
- **Approval:** Automatic.

#### Tier-2: Feature Agents (The "Worker" Class)

- **Scope:** Code generation, unit test writing, non-critical data ingestion.
- **Risk Profile:** Medium. Can modify code in non-critical paths.
- **Approval:** Standard PR review.

#### Tier-3: Core Systems (The "Engineer" Class)

- **Scope:** Refactoring, migration agents, complex orchestration, security scanning.
- **Risk Profile:** High. Can modify shared libraries or infrastructure config.
- **Approval:** Senior/Owner approval required for budget allocation.

#### Tier-4: Governance & Omni (The "God" Class)

- **Scope:** Emergency response, global policy enforcement, full-repo rewriting.
- **Risk Profile:** Critical. Unlimited theoretical access.
- **Approval:** Executive/Quorum approval. Audited logging mandatory.

### Budget Limits Matrix (Per Run)

| Budget Class | Tokens (Total)     | Runtime (Max) | Fan-out (Max)    | External Calls | Risk Ceiling |
| :----------- | :----------------- | :------------ | :--------------- | :------------- | :----------- |
| **Tier-0**   | 50k                | 5 min         | 0 (No recursion) | 5              | 10           |
| **Tier-2**   | 200k               | 15 min        | 5                | 50             | 40           |
| **Tier-3**   | 1M                 | 60 min        | 20               | 500            | 80           |
| **Tier-4**   | _Custom_ (e.g. 5M) | 4 hours       | 100              | Unlimited      | 99           |

### Escalation Behavior

- **Soft Limit (80%):** Warning event emitted to telemetry. Agent notified to wrap up (if capable).
- **Hard Limit (100%):**
  - **Tier 0-2:** Immediate `SIGTERM` / Fail-Closed. Run marked `BUDGET_EXCEEDED`.
  - **Tier 3:** Graceful shutdown signal (30s timeout) before kill.
  - **Tier 4:** Operations Alert triggered. Kill switch manual or requires secondary confirmation.

---

## Appendix A: Example Budget Manifest

Agents declare their class in their configuration (e.g., `agent.yaml`).

```yaml
agent:
  id: "refactor-bot-v1"
  class: "Tier-2"

  # Optional overrides (must be <= Class limit unless granted exception)
  budget_overrides:
    runtime_seconds: 600 # Lower than default 900s

  # Resource requests
  resources:
    model: "gpt-4-turbo"
    memory: "2gb"
```
