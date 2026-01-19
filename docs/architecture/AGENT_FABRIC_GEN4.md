# Gen-4 Engineering+Ops Fabric Architecture

**Status**: Draft Specification
**Version**: 1.0.0
**Context**: Next-Generation Agentic Substrate for Summit

## 1. Overview: The "Explore then Compile" Paradigm

This document specifies the architecture for the Gen-4 Engineering+Ops Fabric. Unlike previous generations that focused on "better prompting" or "tools," Gen-4 focuses on **executable training corpora** and **two-phase autonomy**.

The core architectural shift is the separation of agentic behavior into two distinct phases:

1.  **Explore Phase (Non-Deterministic)**: High-entropy exploration, hypothesis generation, and experimental coding.
2.  **Compile Phase (Deterministic)**: The reduction of exploration into a rigorous, attestable, and reproducible artifact stream that gates merges and deployments.

## 2. Core Architecture

### 2.1 Two-Phase Autonomy

#### Phase A: Explore (The Lab)
*   **Environment**: Ephemeral, sandboxed containers.
*   **Permissions**: Read-only on production state; Write access to scratchpads and ephemeral branches.
*   **Behavior**:
    *   Agents browse code, telemetry, and docs.
    *   Agents hypothesize fixes and run experiments.
    *   Agents generate multiple candidate patches.
    *   **Output**: A candidate `Trajectory` and a proposed `Diff`.

#### Phase B: Compile (The Factory)
*   **Environment**: Pinned, hermetic CI environments (referencing `docs/compliance/release_evidence_provenance.md`).
*   **Permissions**: Strict CI/CD context.
*   **Behavior**:
    *   Replays the proposed `Diff` on a clean state.
    *   Executes the **Hybrid Verification** suite.
    *   Generates the **Evidence Bundle**.
    *   **Output**: A signed, merge-ready Artifact or a Rejection Report.

### 2.2 Hybrid Verification Backbone

To avoid saturation effects of single-mode verification, the fabric mandates two orthogonal verifier families:

1.  **Execution-Based Verifiers (Dynamic)**
    *   **Unit/Integration Tests**: Standard `jest`/`vitest` suites.
    *   **Runtime Probes**: Ephemeral deployment health checks.
    *   **Canaries**: Traffic-shifting verification (where applicable).
    *   **Security Scans**: DAST, Fuzzing.

2.  **Execution-Free Verifiers (Static)**
    *   **Static Analysis**: ESLint, SonarQube, CodeQL.
    *   **Policy Checks**: OPA (Open Policy Agent) rules against `docs/governance/INDEX.yml`.
    *   **Semantic Constraints**: Dependency license checks, SBOM validation, Governance compliance (`agent-ops.md`).

## 3. Component Boundaries & Multi-Agent Mesh

The system is not a single "Agent" but a mesh of specialized roles ensuring separation of duties.

| Role | Responsibility | Access Scope |
| :--- | :--- | :--- |
| **Localizer** | Navigates code/telemetry graphs to pinpoint issues. | Read-Only (Code, Logs, Metrics) |
| **Planner** | Decomposes tasks into steps; assesses risk. | Read-Write (Ticket/Issue Tracker) |
| **Implementer** | Generates code edits and diffs. | Write (Ephemeral Branches) |
| **Verifier** | Orchestrates the Hybrid Verification suite. | CI Execution Context |
| **Reviewer** | Checks style, maintainability, and policy. | PR Comment Access |
| **Release Captain** | Manages change control, rollbacks, and comms. | Production Deployment |

## 4. Artifact Schemas

### 4.1 Trajectory Artifact
Stored for training verifiers and auditing exploration.

```json
{
  "trace_id": "uuid",
  "agent_id": "implementer-v4",
  "task_id": "issue-123",
  "steps": [
    {
      "step_id": 1,
      "action": "tool_call",
      "tool": "grep",
      "args": { "pattern": "error_handler" },
      "output_hash": "sha256:..."
    },
    ...
  ],
  "outcome": "patch_generated"
}
```

### 4.2 Evidence Bundle (Enhanced)
Extends `docs/governance/evidence_catalog.json`.

```json
{
  "bundle_id": "ev-2025-10-14-xyz",
  "governance_gate": "Gen4-Compile",
  "artifacts": {
    "source_diff": "sha256:...",
    "verification_report": {
      "execution_tests": "pass (145/145)",
      "static_checks": "pass (22/22)",
      "policy_eval": "pass"
    },
    "reproducibility": {
      "container_hash": "sha256:...",
      "input_snapshot": "sha256:..."
    }
  },
  "attestation": "intoto-provenance-v1"
}
```

## 5. Security Model: Tier-0 Risk Surface

Autonomy is treated as a critical risk. The following controls are mandatory:

1.  **Least Privilege**: Agents operate with the minimum scopes required for their active Role (see Component Boundaries).
2.  **Hard Sandboxing**: All Explore phase execution occurs in ephemeral, network-restricted containers.
3.  **Signed Toolchains**: All tools invoked by agents must be binary-signed and allow-listed.
4.  **Human-in-the-Loop Gating**: High-impact actions (merge to main, deploy to prod) require explicit human approval or a Tier-4 "Emergency Break-glass" protocol.

## 6. Implementation Roadmap

### Phase 1: Trust Substrate
*   [ ] Implement **Sandboxed Execution** environments for Explore phase.
*   [ ] Formalize **Evidence Bundles** for all agent actions.
*   [ ] Deploy **OPA Policy Engine** for pre-merge gating.

### Phase 2: Internal Evaluation
*   [ ] Integrate **SWE-bench** style evaluation tasks.
*   [ ] Create **Mutated Realism** benchmarks (transforming issues to chat interactions).

### Phase 3: Closed-Loop Ops
*   [ ] Connect **Telemetry** (Datadog/PagerDuty) to the Localizer agent.
*   [ ] Enable **Automated Remediation** workflows (Explore -> Compile -> PR).

### Phase 4: Compounding Advantage
*   [ ] Implement **Trajectory Storage** and indexing.
*   [ ] Begin **Verifier Training** on internal failure modes.
