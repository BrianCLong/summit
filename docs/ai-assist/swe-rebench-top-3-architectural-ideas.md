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

---

## Extension: Why the Next Generation Looks Like an Agent OS (Not a Single Model)

SWE-rebench V2 implies a decomposition pattern that aligns with high-performing coding systems: specialized agents orchestrated by a runtime controller. A single model loop (`read → patch → retry`) is intentionally constrained by context saturation and linear exploration.

### Architectural implication for Summit

Treat the orchestration runtime as the control kernel and treat the LLM as a proposal engine:

- **Planner Agent:** converts issue/task into bounded hypotheses and tool plans.
- **Environment Agent:** reconstructs deterministic build/test execution.
- **Search Agent:** explores parallel patch branches under explicit budget.
- **Verifier Agent:** executes tests and computes fail→pass/regression metrics.
- **Memory Agent:** stores reusable traces/patterns for future task acceleration.

This creates bounded, inspectable control flow with replayability, branch-level telemetry, and clearer fault isolation.

## Extension: Why Search Trees Outperform Retry Loops at Scale

SWE-rebench task structure (`base_commit`, deterministic environment, behavior-based test outcomes) maps directly to state/action/reward formalization:

- **State:** repository snapshot at commit + branch patch history
- **Action:** candidate code transformation
- **Reward:** fail→pass delta minus regressions and budget penalties

### Summit design directive

- Keep `beam` as initial policy for deterministic branching.
- Require branch scoring to include:
  - fail→pass count,
  - regression penalty,
  - touched-file scope fit,
  - patch size penalty.
- Persist branch traces (`trace.jsonl`) to avoid repeated dead-end hypotheses.

## Extension: Repository-Scale World Models + GraphRAG

The practical next step is coupling GraphRAG structure with predictive impact estimation so patches are simulated before expensive test execution.

### Summarized control loop

1. Build/retrieve task scope subgraph (files, symbols, tests, dependencies).
2. Generate candidate edits against scoped nodes.
3. Predict impact risk using graph + prior execution traces.
4. Execute only top-ranked branches in deterministic runtime.
5. Write outcomes back as trace memory for policy improvement.

### Summit design directive

- Promote `GraphRAG scope` from retrieval utility to planning primitive.
- Add a lightweight impact predictor fed by:
  - call/import/test edges,
  - historical branch outcomes,
  - branch edit footprint.
- Use predictor scores to gate branch execution order (best-first under budget).

## Implementation Delta (Governed, Feature-Flagged)

Introduce explicit flags so the rollout remains reversible and audit-safe:

- `SUMMIT_SWE_LAB_ENABLED=false`
- `SUMMIT_SWE_SEARCH_STRATEGY=beam`
- `SUMMIT_SWE_MAX_BRANCHES=8`
- `SUMMIT_SWE_ENABLE_IMPACT_PREDICTOR=false`

## MAESTRO Alignment for the Extended Architecture

- **MAESTRO Layers:** Foundation, Data, Agents, Tools, Infra, Observability, Security.
- **Threats Considered:** tool abuse, prompt injection in repository text, malicious setup scripts, flaky-test amplification, branch explosion.
- **Mitigations:** allowlisted tool calls, deterministic containers, validator fail-closed semantics, branch/time budgets, artifact integrity checks.

## Operational Finality

The governed path forward is definitive: run deterministic tasks, search over bounded hypotheses, score by behavioral correctness, and accumulate trace evidence for iterative improvement. This yields a measurable transition from static patch attempts to a reproducible, self-improving autonomous SWE platform.
