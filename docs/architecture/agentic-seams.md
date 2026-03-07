# Agentic Seams & Integration Points (Architecture Lab)

## Readiness Gate

All agentic work routes through the Summit Readiness Assertion. This document captures present seams and explicitly constrains architecture experiments to proposal-only status until evidence gates and human review are complete.

## Reconnaissance Scope

This reconnaissance focused on active orchestration and governance seams:

- `agentic/` runtime modules and orchestrator loop
- `pipelines/` manifest/runner structure
- `governance/tool_registry.yaml` execution tool allowlist
- `agent-contract.json` machine-readable guardrails
- `docs/architecture/agentic-integration-spine.md` target architecture contract

## System Seams (Present)

| Seam | Location | Contract | Observability | Current Limitation |
| --- | --- | --- | --- | --- |
| Agentic control plane | `agentic/` | Orchestrator loop + invariant checks + module dispatch. | Console cycle logs, module-level output. | Simulated signals; needs production telemetry integration. |
| Agentic manifesto and runtime intent | `agentic/AGENTIC_MANIFEST.md` | Tier definitions and intent hierarchy. | Documentation-level traceability. | Descriptive posture; enforcement requires runtime hooks. |
| Pipeline orchestration | `pipelines/` | Unified manifests with runtime adaptors (Airflow/Maestro/local). | Tests + manifest validation flows. | Mandate/policy checks not consistently enforced at runtime entry. |
| Tool governance | `governance/tool_registry.yaml` | Allowed tools and argument policy. | Registry-as-code. | Dispatch-time enforcement coverage is incomplete. |
| Agent contracts | `agent-contract.json` | Machine-readable execution constraints. | Contract file versioning. | Contract validation not guaranteed in all execution paths. |
| Integration spine | `docs/architecture/agentic-integration-spine.md` | Mandates + twin + provenance reference model. | Architectural contract doc. | Full implementation parity varies across services. |

## Agent Interaction Points

### Orchestrator Loop
- **Trigger**: `agentic/core/Orchestrator.ts` starts the perceive → invariants → act cycle.
- **Contract**: each cycle evaluates invariants before action dispatch.
- **Limitation**: cycle state is currently simulated.
- **Governed Exception**: simulated state remains permitted only while telemetry wiring is staged.

### Pipeline Runtime Entry
- **Trigger**: pipeline manifests and runner entry points.
- **Contract**: pipelines should run only under validated authority and bounded execution context.
- **Limitation**: mandate validation is not universally attached.
- **Governed Exception**: runtime-specific bypass risk is tracked and targeted for closure.

### Governance and Compliance Hooks
- **Trigger**: tool registry and agent contracts at dispatch time.
- **Contract**: only approved tools + approved argument surfaces + evidence logging.
- **Limitation**: not all dispatch paths enforce registry and contract checks before tool execution.
- **Governed Exception**: phased enforcement pending adapter normalization.

## MAESTRO Security Alignment

- **MAESTRO Layers**: Foundation, Agents, Tools, Infra, Observability, Security.
- **Threats Considered**: goal manipulation, prompt injection, tool abuse, contract bypass, evidence tampering.
- **Mitigations**:
  - Gate dispatch through tool-registry allowlist checks.
  - Enforce pre-flight contract validation on all runnable agent entry points.
  - Emit immutable evidence records for every dispatched operation.
  - Add anomaly telemetry for rejected calls and contract failures.

## Candidate Architecture Experiments (Proposal-Only)

1. **Experiment: Orchestrator Signal Wiring**
   - **Branch/Worktree**: `arch/agentic-boundaries/orchestrator-signal-wiring`
   - **Objective**: replace simulated cycle inputs with bounded telemetry adapters.
   - **Scope**: `agentic/core/*`, telemetry adapters, no production behavior change.
   - **Success Criteria**: deterministic cycle evidence with replayable input snapshots.

2. **Experiment: Pipeline Mandate Gate**
   - **Branch/Worktree**: `arch/agentic-boundaries/pipeline-mandate-gate`
   - **Objective**: enforce mandate checks at runner entry before execution.
   - **Scope**: `pipelines/registry` + `pipelines/runners` only.
   - **Success Criteria**: execution denied without valid mandate, with auditable rejection logs.

3. **Experiment: Tool Registry Enforcement Hook**
   - **Branch/Worktree**: `arch/agentic-boundaries/tool-registry-hook`
   - **Objective**: enforce tool allowlist/argument constraints at orchestration dispatch.
   - **Scope**: dispatch paths and associated tests.
   - **Success Criteria**: unregistered tools and disallowed args are blocked before execution.

4. **Experiment: Contract Preflight for Agentic CLI**
   - **Branch/Worktree**: `arch/agentic-boundaries/contract-preflight-cli`
   - **Objective**: validate `agent-contract.json` before any autonomous task launch.
   - **Scope**: CLI entrypoints + validation middleware.
   - **Success Criteria**: invalid or expired contracts fail fast with structured evidence.

## Decision, Evidence, and Rollback Discipline

- Every experiment must produce an ADR entry (`governance/decisions/ADR-AG-*.md`) with explicit rollback triggers.
- Every experiment must define a post-deploy accountability window and metrics watch list.
- No experiment may merge without human countersign and evidence bundle completeness.
