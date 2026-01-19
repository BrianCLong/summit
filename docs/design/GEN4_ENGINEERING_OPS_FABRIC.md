# Gen-4 Engineering+Ops Fabric: The "Generational Transcendence" Architecture

## 1. Overview

This document specifies the architecture for Summit's "Gen-4 Engineering+Ops Fabric." It moves beyond simple "agent loops" to a robust, secure, and verifiable system designed for durable advantage. It addresses the realities of data scaling, hybrid verification, and the necessary security posture for autonomous systems.

### Core Philosophy
The system is built on two foundational shifts:
1.  **Two-Phase Autonomy:** A distinct separation between *Exploration* (non-deterministic, creative) and *Compilation* (deterministic, attestable).
2.  **Hybrid Verification:** The mandatory use of both *execution-based* (tests, dynamic analysis) and *execution-free* (static analysis, policy) verifiers to prevent saturation and coverage gaps.

## 2. Architecture: Two-Phase Autonomy

### Phase 1: Explore (The "Messy" Middle)
*   **Nature:** Non-deterministic, high-variance, creative.
*   **Permissions:** Read-only access to production/secrets; Write access only to ephemeral/sandboxed environments.
*   **Activities:**
    *   Hypothesis generation.
    *   Experimental coding and "try-fail" loops.
    *   Tool usage (searching, browsing, logs analysis).
    *   Multi-candidate generation.
*   **Output:** A "Plan" or "Candidate Patch" that is *not* yet trusted.

### Phase 2: Compile (The "Gated" Output)
*   **Nature:** Deterministic, strictly governed, replayable.
*   **Permissions:** Write access to the repository (via PR) or Infrastructure (via specific tailored APIs), gated by policy.
*   **Activities:**
    *   **Pruning:** Selecting the single best candidate from the Explore phase.
    *   **Determinism:** Re-running the solution in a pinned environment to ensure reproducibility.
    *   **Attestation:** Generating cryptographic evidence of the change (provenance, diffs, test results).
*   **Output:** A signed, verified artifact (PR, release bundle, remediation action) ready for human or automated merge.

## 3. Component Boundaries & Agent Roles

We reject the "group chat" model in favor of strict separation of duties.

| Role | Responsibility | Inputs | Outputs |
| :--- | :--- | :--- | :--- |
| **Localizer** | Navigation & Context | Issue, Telemetry, Codebase | Context Graph, Relevant Files List |
| **Planner** | Decomposition & Risk | Context Graph, Goal | Execution Plan, Risk Assessment |
| **Implementer** | Code/Action Editing | Plan, File Content | Diff / Patch Candidates |
| **Verifier** | Hybrid Scoring | Patch Candidates, Tests | Score, Failure Report, Regression Check |
| **Reviewer** | Policy & Style | Diff, Linter Results | Policy Violations, Style Comments |
| **Release Captain** | Change Control | Verified Diff, Evidence | Signed Release/PR, Rollback Trigger |

## 4. Hybrid Verification Strategy

Verification must satisfy two orthogonal dimensions to be robust.

### A. Execution-Based (Dynamic)
*   **Unit/Integration Tests:** Standard test suites (Jest/Pytest).
*   **Canaries:** Ephemeral deployments to check health.
*   **Runtime Probes:** Checking telemetry/metrics in the sandbox.
*   **Replay:** Verifying that re-running the agent's actions produces the exact same result.

### B. Execution-Free (Static)
*   **Static Analysis:** TypeScript checks, ESLint, Ruff.
*   **Policy Engines:** OPA (Open Policy Agent) rules for compliance (e.g., "no new keys in code").
*   **Semantic Constraints:** Dependency allow-lists, license compliance checks.
*   **Drift Detection:** Comparing against "golden" architectural patterns.

## 5. Event Streams & Artifact Schemas

The fabric operates on a structured event log, not just chat history.

### Event Stream (`agent_events.jsonl`)
Every action is recorded with:
*   `timestamp`: ISO-8601 (high precision).
*   `agent_id`: The specific role/instance acting.
*   `action_type`: `tool_call`, `thought`, `plan_update`, `file_edit`.
*   `payload`: Structured data specific to the action.
*   `evidence_ref`: Pointer to a blob (screenshot, log file, diff).

### Artifact Schema: The Evidence Bundle
For every gated change, we produce a bundle:
```json
{
  "trace_id": "uuid",
  "goal": "Fix bug X",
  "outcome": "success",
  "phases": {
    "explore": {
      "attempts": 4,
      "trace_ref": "s3://.../explore_trace.jsonl"
    },
    "compile": {
      "verified_diff_sha": "sha256:...",
      "tests_passed": ["test_a", "test_b"],
      "static_checks": ["eslint:pass", "opa:pass"],
      "reproducibility_hash": "sha256:..."
    }
  },
  "signatures": {
    "verifier": "sig_...",
    "policy_engine": "sig_..."
  }
}
```

## 6. Permission Model & Security (Tier-0)

Autonomy introduces critical risks. The security model is "Trust but Verify," heavily leaning on "Verify."

### Principles
*   **Least Privilege:** Agents have *no* inherent write access to `main`. They can only write to feature branches or sandboxes.
*   **Sandboxing:** All code execution happens in ephemeral containers with no network access to the internal production VPC (unless explicitly allow-listed).
*   **Signed Toolchains:** Agents can only execute tools that are cryptographically signed and known to the registry.
*   **Human-in-the-Loop (HITL):** High-impact actions (e.g., `drop table`, `force push`, `deploy prod`) require explicit human confirmation tokens.

### CI/Ops Gates
1.  **The "Compile" Gate:** No agent output moves to PR without passing the Compile phase (determinism check).
2.  **The Evidence Gate:** PRs created by agents are blocked unless accompanied by a valid Evidence Bundle.
3.  **The Regression Gate:** If the Verifier detects a regression score > 0, the change is rejected automatically.

## 7. Roadmap to Implementation

### Phase 1: Trust Substrate
*   Implement `agent_events.jsonl` logging.
*   Build the Evidence Bundle generator.
*   Enforce "Compile" phase for all agent PRs.

### Phase 2: Continuous Evaluation
*   Integrate realistic "mutation" benchmarks (prevent overfitting to SWE-bench).
*   Add multi-round "goal-oriented" tasks to CI.

### Phase 3: Closed-Loop Ops
*   Connect `Localizer` to telemetry/alerts (Datadog/PagerDuty).
*   Enable `Implementer` to propose remediation PRs.

### Phase 4: Compounding Advantage
*   Store all trajectories.
*   Train custom verifiers on internal failure modes.
