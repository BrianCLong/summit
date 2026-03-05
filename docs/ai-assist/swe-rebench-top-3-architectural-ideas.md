# SWE-rebench V2: Three Architectural Ideas Summit Should Operationalize

## Purpose

This brief captures the three most consequential architectural insights from SWE-rebench V2 and translates them into Summit implementation guidance for autonomous coding-agent loops.

## 1) Treat Environment Reconstruction as a First-Class Control Loop

### Insight
SWE tasks are not only patch-generation problems; they are environment-reconstruction problems. Reproducibility requires deterministic checkout + setup + test harness execution, not just code editing.

### Why it matters in Summit
A patch agent is downstream of environment readiness. If build/test setup is non-deterministic, patch quality is not measurable and RL/evaluation signals degrade.

### Summit design directive
- Add an explicit `Environment Planner` stage before any patch proposals.
- Require task-level checks for:
  - build tool detection
  - dependency manager detection
  - test command synthesis
  - pre-patch fail-state capture
- Fail closed if environment cannot be reconstructed with deterministic inputs.

## 2) Optimize for Behavioral Delta (Fail→Pass), Not Patch Similarity

### Insight
The core learning/evaluation unit is behavior change measured through test transitions. Diff overlap with reference patches is secondary.

### Why it matters in Summit
Behavior-first rewards align search and training with software correctness, reduce overfitting to stylistic edits, and support multi-language evaluation.

### Summit design directive
- Compute reward from test transitions:
  - positive: failing tests that now pass
  - negative: new regressions
  - optional shaping: patch-size penalty
- Persist deterministic artifacts:
  - `report.json`
  - `metrics.json`
  - `stamp.json`
- Keep unstable timestamps out deterministic artifacts.

## 3) Scale Requires Validator Agents (Not Just Task Harvesting)

### Insight
Large task collections include substantial noise; a validation gate is mandatory to remove unsound tasks before training/eval.

### Why it matters in Summit
Without validation, agents train on contradictory signals (already-passing tasks, flaky suites, broken repos), reducing convergence quality and increasing benchmark noise.

### Summit design directive
- Introduce a `Task Validator` gate that must prove:
  1. repo/setup is executable,
  2. fail-state is reproducible,
  3. reference patch or equivalent behavior restoration is verifiable,
  4. regression checks pass.
- Persist validation outcomes in a machine-readable task-manifest for CI and downstream training jobs.

## Recommended Summit Agent Loop (Minimal Viable Architecture)

1. Task Ingestion
2. Validation Gate
3. Environment Planner
4. Environment Executor
5. Graph-scoped Retrieval (GraphRAG)
6. Search Controller (beam/tree over patch hypotheses)
7. Test Executor
8. Behavior Evaluator
9. Artifact Writer + Drift Monitor hooks

## MAESTRO Security Alignment

- **MAESTRO Layers:** Foundation, Data, Agents, Tools, Infra, Observability, Security.
- **Threats Considered:** prompt injection via repo text, malicious setup scripts, test-bypass patches, supply-chain drift, artifact tampering.
- **Mitigations:** containerized sandbox execution, pinned base commits/image references, fail-closed validator gate, deterministic artifact schema, policy-gated CI checks with traceability.

## Adoption Order (90% value quickly)

1. Deterministic runner + artifact schema
2. Task validator gate
3. Behavior reward evaluator
4. Search-controller integration
5. Drift monitor + nightly smoke subset

## Finality

Summit should implement these as governed, feature-flagged capabilities to establish a reproducible, machine-verifiable SWE benchmark and training substrate. This is the shortest path from static coding assistant behavior to outcome-owning autonomous SWE loops.
