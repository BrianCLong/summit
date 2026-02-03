# Summit SpecFlow & Artifact Graph Engine

## Overview

This specification outlines the "Summit SpecFlow" system, designed to **subsume, surpass, and moat** existing workflow patterns like OpenSpec. It transforms engineering workflows from rigid pipelines into a fluid, artifact-driven DAG (Directed Acyclic Graph) of actions, governed by the Summit Artifact Graph Engine.

## Philosophy: Actions, Not Phases

OpenSpec rightly identifies that workflows should be fluid actions rather than locked phases. Summit adopts this philosophy:
*   **Actions**: Independent, composable operations (e.g., `explore`, `design`, `implement`, `verify`) that operate on artifacts.
*   **Artifacts**: Durable, versioned entities (e.g., Specs, Plans, Test Suites, Evidence Bundles) that serve as inputs and outputs for actions.
*   **Fluidity**: Developers can move backward (revisit design), fork (parallel exploration), or fast-forward (skip formal planning for trivial changes) based on context, without breaking the process.

## Summit Artifact Graph Engine

The core engine is a **universal workflow compiler**:
*   **Workflow = Typed DAG**: Workflows are defined as a graph where nodes are Artifacts and edges are Actions or Dependencies.
*   **Schemas**: Artifacts are strictly typed and versioned. Schemas can be composed and inherited (e.g., `BaseSpec` -> `SecurityCriticalSpec`).
*   **Engine**: A runtime that validates artifact states, enforces policy guards, and executes actions.

### Core Artifact Types
1.  **Finding**: Output of `/summit:explore`. Structured investigation data and hypotheses.
2.  **ChangeRequest**: The root intent for a modification.
3.  **Spec**: Detailed requirements and design.
4.  **Plan**: Execution steps (tasks).
5.  **Implementation**: The code changes (linked via Git).
6.  **VerificationReport**: Output of `/summit:verify`.
7.  **ReleaseBundle**: The final artifact for deployment.

## Workflow Patterns

Summit supports multiple workflow patterns tailored to different needs:

### 1. Quick Feature
For low-risk, well-understood changes.
*   **Flow**: `/summit:new` -> `/summit:ff` -> `/summit:apply` -> `/summit:verify` -> `/summit:archive`
*   **Logic**: Skips detailed `explore` and `spec` phases if the scope is trivial, jumping straight to implementation (`apply`) while still enforcing verification.

### 2. Exploratory
For ambiguous or complex problems.
*   **Flow**: `/summit:explore` -> `/summit:continue` (iterate) -> `/summit:new` -> ...
*   **Logic**: Focuses on gathering `Findings` first. The artifact graph grows as hypotheses are tested.

### 3. Parallel Changes
For concurrent work on related features.
*   **Flow**: Multiple `/summit:new` branches operating on the same or related specs.
*   **Logic**: The engine detects conflicts at the spec/policy level, not just code lines.

## Verify++ Rubric (The Moat)

Summit upgrades the verification process from a simple check to a **proof-carrying change**. Every `/summit:verify` action must satisfy:

1.  **Completeness**: All tasks checked, requirements met, scenarios covered.
2.  **Correctness**: Spec intent preserved, edge cases handled.
3.  **Coherence**: Architecture decisions reflected in code structure.
4.  **Security**: Threat model updated, SAST/DAST passed, secrets scanned, dependency risk assessed.
5.  **Compliance**: Policy checks (OPA), data handling rules, audit log completeness.
6.  **Performance/Cost**: Budget checks, regression analysis, cost spike explanation.
7.  **UX Evidence**: Accessibility checks, UI consistency screenshots.
8.  **Provenance**: Signed attestations for "what ran" and "what changed" (SLSA-ish), bundled as release evidence.

## Command Surface

The CLI exposes high-level commands that manipulate the artifact graph:

*   `/summit:explore`: structured investigation -> produces `Findings` artifact + candidate hypotheses.
*   `/summit:new <change-id>`: scaffolds a change folder with typed artifacts.
*   `/summit:continue`: stepwise creation, with guardrails + policy prompts.
*   `/summit:ff`: generate planning artifacts fast (when scope is clear).
*   `/summit:apply`: task-execution with checkpointing + resumability (parallel-friendly).
*   `/summit:verify`: runs Verify++ producing an evidence bundle + a pass/fail + waivers.
*   `/summit:archive`: merges deltas, stamps provenance, updates changelog/trace graph.
*   `/summit:bulk-archive`: multi-change merge with automated conflict proofs.

## Folder Layout

Workflows are persisted in the repository to ensure version control and visibility.

```
.summit/
├── artifacts/          # Storage for all active workflow artifacts
│   ├── change-123/     # Container for a specific change
│   │   ├── spec.yaml
│   │   ├── plan.json
│   │   ├── evidence/
│   │   └── verification-report.json
│   └── ...
├── schemas/            # JSON/YAML schemas for artifacts
│   ├── spec.schema.json
│   ├── finding.schema.json
│   └── ...
└── config/             # Workflow engine configuration
    └── policies.yaml
```

## CI/CD Integration

The `/summit:verify` command maps directly to CI gates:

| Verify++ Check | CI Job / Script |
| :--- | :--- |
| **Completeness** | `scripts/ci/verify_completeness.ts` |
| **Correctness** | `npm test` / `vitest` |
| **Coherence** | `scripts/ci/arch_lint.ts` |
| **Security** | `scripts/ci/security_scan.sh` (SAST, Secrets) |
| **Compliance** | `scripts/ci/policy_check.ts` (OPA) |
| **Performance** | `scripts/ci/perf_budget.ts` |
| **UX Evidence** | `scripts/ci/ui_test.ts` (Playwright screenshots) |
| **Provenance** | `scripts/compliance/generate_provenance.ts` |

## The Moat: IntelGraph Integration

Every artifact and action in the Summit SpecFlow is a node or edge in **IntelGraph**.
*   **Traceability**: "Which requirement caused this code change?"
*   **Impact Analysis**: "Which tests cover this spec?"
*   **Learning**: The system learns which workflow graphs result in faster shipping with fewer regressions.
