# Agentic Seams & Integration Points (Architecture Lab)

## Readiness Gate

All agentic changes route through the Summit Readiness Assertion. This document formalizes present seams and dictates future experiments only after evidence gates are satisfied.

## System Seams (Present)

| Seam | Location | Contract | Current Limitation |
| --- | --- | --- | --- |
| Agentic control plane | `agentic/` | Orchestrator loop, invariants, and module registry. | Orchestrator cycles are simulated and require production-grade signal wiring. |
| Agentic manifesto & tiering | `agentic/AGENTIC_MANIFEST.md` | Tiered runtime intent and system posture. | Manifesto is descriptive; operational enforcement requires explicit wiring. |
| Pipeline orchestration | `pipelines/` | Unified pipeline manifests with multi-runtime adapters. | Pipeline execution governance is not yet wired to agent mandates. |
| Tool governance | `governance/tool_registry.yaml` | Approved tool registry for agentic workflows. | Tool registry compliance requires enforcement at orchestration boundaries. |
| Agent contracts | `agent-contract.json` | Machine-readable guardrails for agent execution. | Contract needs explicit validation hooks in orchestration runners. |
| Agentic integration spine | `docs/architecture/agentic-integration-spine.md` | Governance-first integration gateway, mandates, and provenance. | Integration spine is defined; implementation coverage varies by service. |

## Agent Interaction Points

### Orchestrator Loop
- **Trigger**: `agentic/core/Orchestrator.ts` bootstraps the loop.
- **Contract**: cycles through perceive → invariants → act.
- **Observability**: console-logged cycle markers; requires structured telemetry for evidence.
- **Governed Exception**: simulated signals are treated as a governed exception until live signals are integrated.

### Pipeline Runtime Integration
- **Trigger**: pipeline manifests and registry define workflows.
- **Contract**: runtime adapters (Airflow/Maestro/local) consume manifests.
- **Observability**: pipeline registry & tests in `pipelines/tests`.
- **Governed Exception**: agent mandate enforcement is a required extension point.

### Governance & Compliance Gates
- **Trigger**: tool registry, agent contract, and readiness assertion.
- **Contract**: only approved tools + scoped mandates, with evidence bundling.
- **Observability**: registry YAML is the single source of truth.
- **Governed Exception**: enforcement hooks must be attached to each runtime entry point.

## MAESTRO Security Alignment

- **MAESTRO Layers**: Foundation, Agents, Tools, Infra, Observability, Security.
- **Threats Considered**: goal manipulation, prompt injection, tool abuse, evidence tampering.
- **Mitigations**:
  - Enforce tool registry allowlist at execution boundaries.
  - Validate agent contracts before dispatch and log provenance per cycle.
  - Require evidence bundles for automation runs and gate on readiness assertion.

## Candidate Architecture Experiments (Proposal-Only)

1. **Experiment: Orchestrator Signal Wiring**
   - **Branch/Worktree**: `arch/agentic-boundaries/orchestrator-signal-wiring`
   - **Objective**: wire real telemetry inputs into `agentic/core/Orchestrator.ts` and emit structured evidence.
   - **Scope**: agentic core only; no production wiring without mandate approval.
   - **Success Criteria**: deterministic cycle logs + evidence bundle emitted per run.

2. **Experiment: Pipeline Mandate Gate**
   - **Branch/Worktree**: `arch/agentic-boundaries/pipeline-mandate-gate`
   - **Objective**: attach mandate validation to pipeline runner entry points.
   - **Scope**: `pipelines/registry` + `pipelines/runners` only.
   - **Success Criteria**: pipeline execution blocked without valid mandate; audit log emitted.

3. **Experiment: Tool Registry Enforcement Hook**
   - **Branch/Worktree**: `arch/agentic-boundaries/tool-registry-hook`
   - **Objective**: enforce `governance/tool_registry.yaml` in agentic dispatch.
   - **Scope**: agentic dispatch layers and CLI entry points only.
   - **Success Criteria**: unregistered tools rejected with traceable error evidence.

## Decision & Evidence Requirements

- Every experiment must record a decision entry in `governance/decisions/ADR-AG-*.md` with rollback triggers.
- Evidence bundles are mandatory for any agentic execution path changes.
- No experiment is merged without human review and explicit countersign.
