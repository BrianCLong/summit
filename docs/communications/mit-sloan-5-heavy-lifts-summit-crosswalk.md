# MIT Sloan "5 Heavy Lifts in Deploying AI Agents" — Summit Crosswalk

## Source
- MIT Sloan School of Management, *Ideas Made to Matter*: [5 Heavy Lifts in Deploying AI Agents](https://mitsloan.mit.edu/ideas-made-to-matter/5-heavy-lifts-deploying-ai-agents).

## Summit Readiness Assertion
This crosswalk treats the five heavy lifts as implementation obligations, not abstract transformation themes. Summit adopts evidence-first orchestration and GA gate enforcement to convert each lift into deterministic controls.

## Operator Summary
The MIT Sloan framing aligns with Summit's current posture: agent adoption is a workflow, governance, and data-fidelity redesign problem. The implementation target is machine-verifiable behavior under deny-by-default policy and release gates.

## Five Lifts → Summit Enforcement

### 1) Workflow redesign (assistive to agentic)
- **Requirement**: agents execute defined phases, not ad hoc suggestions.
- **Summit enforcement**:
  - Role contracts under `src/agents/roles/` and `src/agents/contracts/`.
  - Orchestrated state transitions under `src/agents/orchestrator/`.
  - Evidence output at run completion (`report.json`, `metrics.json`, `stamp.json`, `evidence/index.json`).
- **Gate expectation**: workflows are CI-checkable and replayable.

### 2) Decision rights and escalation
- **Requirement**: explicit authority boundaries, escalation routes, and operator override.
- **Summit enforcement**:
  - Role policy in `.github/policies/agent-roles.rego`.
  - Escalation mapping in `src/agents/config/escalation.ts`.
  - Kill-switch support in `src/agents/featureFlags.ts`.
  - Immutable action logging in `src/agents/audit/`.
- **Gate expectation**: GA-critical changes must include owner, escalation path, fallback behavior, and tested rollback trigger.

### 3) Data foundation quality and provenance
- **Requirement**: contextual completeness, freshness, and provenance-aware retrieval.
- **Summit enforcement**:
  - GraphRAG pipelines in `src/graphrag/pipelines/`.
  - Provenance tracking in `src/graphrag/provenance/`.
  - Data source connectors in `src/connectors/<source>/`.
  - Classification policy in `.github/policies/data-classification.rego`.
- **Gate expectation**: retrieval freshness SLA and provenance audit entries must be present in evidence bundles.

### 4) Governance and risk controls
- **Requirement**: autonomy must be constrained by runtime policy and measurable safety controls.
- **Summit enforcement**:
  - Input abuse controls in `src/agents/security/inputGuard.ts`.
  - Regression/eval harness in `tests/agents/evals/`.
  - Supply-chain and security validation in `.github/workflows/ci-security.yml`.
  - Guardrail enforcement in `.github/actions/agent-guardrails/`.
- **Gate expectation**: policy-deny fixtures and deterministic evals are required for GA-sensitive paths.

### 5) Trust via transparency and measurement
- **Requirement**: operators trust agents when decisions are inspectable and performance is measured.
- **Summit enforcement**:
  - Required checks and milestone gates in `.github/` governance workflows.
  - Standard evidence schema for each agent run.
- **Gate expectation**: each action is attributable, reproducible, and tied to merge-quality criteria.

## MAESTRO Security Alignment
- **MAESTRO Layers**: Agents, Data, Tools, Observability, Security.
- **Threats considered**: prompt injection, tool abuse, silent policy drift, unverifiable output.
- **Mitigations**: deny-by-default role policies, explicit escalation and kill-switch controls, deterministic eval fixtures, and evidence artifact requirements.

## Strategic Outcome
Summit does not frame these as adoption hurdles. Summit operationalizes them as release controls that increase delivery confidence and reduce governance variance across agentic workflows.
