# Gen-4 Engineering+Ops Fabric

**Status:** Draft
**Version:** 1.0
**Owner:** Architecture & Governance Team

---

## 1. Executive Summary

The **Gen-4 Engineering+Ops Fabric** represents the next evolutionary step for the Summit agent mesh. It shifts from "better prompting" to "executable training corpora" and "hybrid verification" as the primary sources of durable advantage. This architecture operationalizes recent research signals—specifically SWE-Gym, R2E-Gym, and emerging commercial "mission control" models—into a concrete, deployable system specification.

The core thesis is that **data scaling** (executable environments and trajectories) and **hybrid verification** (combining execution-based and execution-free checks) are the new moats, replacing simple tool-use capability.

## 2. Core Architecture: Two-Phase Autonomy

The fabric enforces a strict separation between exploration and compilation phases to balance creativity with reliability.

### Phase 1: Explore (Non-Deterministic)
*   **Behavior:** Agents browse, hypothesize, run experiments, generate multiple candidate patches, and call external models.
*   **Constraints:** Sandboxed environment, read-only access to production secrets, bounded resource usage.
*   **Output:** A "Candidate Trajectory" containing the sequence of thoughts, tool calls, and the final proposed patch.

### Phase 2: Compile (Deterministic & Attestable)
*   **Behavior:** The system "compiles" the successful trajectory into a rigid, verifiable output.
*   **Mechanism:**
    *   **Pinned Environments:** Re-execution in a container with content-addressed dependencies.
    *   **Deterministic Ordering:** File writes and commands are executed in a canonical order (e.g., sorted by filename).
    *   **Cached/Verifier-Only Mode:** Model outputs are frozen; the "compile" step only verifies that the patch passes all gates without needing new creative tokens.
*   **Output:** A `stamp.json` and a cryptographically signed Evidence Bundle.

## 3. Component Boundaries & Agent Roles

The fabric eschews a generic "group chat" model in favor of strict separation of duties, aligned with the [Agent Mandates](../governance/AGENT_MANDATES.md).

| Role | Responsibility | Corresponding Agent |
| :--- | :--- | :--- |
| **Localizer** | Navigates the code/telemetry graph to identify the scope of change. | *Orion (Observability) / Codex* |
| **Planner** | Decomposes the task into atomic steps and assesses risk. | *Elara (Strategy)* |
| **Implementer** | Executes edits and runs local tests. | *Codex (Engineering)* |
| **Verifier** | Runs hybrid scoring (tests + static analysis) and regression guardrails. | *Aegis (Security)* |
| **Reviewer** | Checks style, maintainability, and policy conformance. | *Hermes (Docs) / Architect* |
| **Release Captain** | Manages change control, communications, and rollback. | *Jules (Governance)* |

## 4. Hybrid Verification Model

To avoid saturation effects of single-mode verifiers, the fabric employs a dual-track verification strategy (see `TESTING.md`).

### Track A: Execution-Based (Dynamic)
*   **Tests:** Unit, integration, and E2E tests (Jest, Playwright).
*   **Runtime Probes:** Canaries, performance benchmarks, memory leak detection.
*   **Linters:** Compilation checks, type safety.

### Track B: Execution-Free (Static/Policy)
*   **Static Analysis:** AST-based rule checks, complexity analysis.
*   **Policy Engine:** OPA policies checking for banned patterns (e.g., hardcoded secrets, unauthorized imports).
*   **Semantic Constraints:** License compliance, SBOM validation, provenance rules.

## 5. Security & Permission Model

Autonomy is treated as a Tier-0 risk surface. The security model defaults to least privilege.

*   **Sandboxed Execution:** All agent code execution occurs in ephemeral, network-restricted containers (except for allowlisted package registries).
*   **Signed Toolchains:** Agents can only invoke tools that are cryptographically signed and present in the `connectors/registry.json`.
*   **Separation of Planes:**
    *   *Control Plane:* Untrusted content (issues, PR comments) is parsed here.
    *   *Data Plane:* Tool instructions are executed here.
    *   *Hard Boundary:* No raw user input is ever directly `eval`'d or passed to a shell without sanitization.
*   **Human-in-the-Loop:** High-impact actions (merge to `main`, deploy to `prod`) require an explicit approval signal (cryptographic signature or OIDC token) from a human owner.

## 6. Event Streams & Artifact Schemas

Traceability is paramount. Every agent action generates immutable artifacts.

### 6.1. Trajectory Store
*   **Format:** JSONL
*   **Content:**
    *   `step_id`: UUID
    *   `timestamp`: ISO8601
    *   `agent_id`: string
    *   `thought`: string (CoT)
    *   `tool_call`: `{ name, args }`
    *   `tool_output`: string (truncated if large)
    *   `snapshot_hash`: SHA256 of the filesystem state

### 6.2. Evidence Bundle
*   **Manifest:** `checksums.sha256` (sorted)
*   **Contents:**
    *   `diff.patch`: The code change.
    *   `test_results.json`: Output of Track A verification.
    *   `policy_check.json`: Output of Track B verification.
    *   `provenance.intoto.json`: SLSA attestation.
    *   `trajectory.jsonl`: The full execution trace.

## 7. CI/Ops Gates (The Trust Substrate)

The pipeline enforces the transition from "Explore" to "Compile" via strict gates.

1.  **Trust Gate:** Verifies that the Evidence Bundle is complete, the `stamp.json` matches the contents, and the provenance signature is valid.
2.  **Regression Gate:** Runs the `ga:diff:strict` check to ensure no critical metrics (coverage, performance, security) have regressed.
3.  **Determinism Gate:** Re-runs the "Compile" phase in a clean environment to ensure the result is reproducible (blocking "it works on my machine" flakiness).

## 8. Roadmap: Implementation Phases

### Phase 1: Trust Substrate
*   Establish sandboxed execution and immutable logging.
*   Implement Evidence Bundles for every action.
*   Deploy the Policy Engine (OPA).

### Phase 2: Continuous Evaluation
*   Integrate mutated realism tasks (preventing benchmark overfitting).
*   Deploy goal-oriented multi-round tasks (CodeClash style).

### Phase 3: Closed-Loop Ops
*   Connect Telemetry -> Hypothesis -> Runbook Actions.
*   Enable autonomous PR generation for remediation.

### Phase 4: Compounding Advantage
*   Store and train on proprietary trajectories.
*   Implement "SWE-smith" style internal task synthesis.

---
**References:**
*   [SWE-Gym (Dec 2024)](https://arxiv.org/abs/2412.21139)
*   [SWE-smith (Apr 2025)](https://arxiv.org/abs/2504.21798)
*   [R2E-Gym / AgentGym (Apr 2025)](https://arxiv.org/abs/2504.07164)
*   [CodeClash (Nov 2025)](https://arxiv.org/abs/2511.00839)
