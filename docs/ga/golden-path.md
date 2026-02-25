# Summit GA Golden Path Workflow

This document defines the executable Golden Path scaffold for PR-time GA gating.

## Workflow lifecycle

1. **PR trigger**: `.github/workflows/summit-golden-path.yml` runs on pull request updates.
2. **Governance gate**: `governance/policy-check.ts` executes policy checks, including an OPA integration placeholder.
3. **Test gate**: a deterministic test command (`pnpm run test:quick`) runs and records result status.
4. **Evidence generation**: workflow emits `artifacts/summit-golden-path/evidence-bundle.json`.
5. **Observer hook**: workflow invokes `services/observer/notify.ts` with a structured event payload.
6. **Gate enforcement**: workflow blocks the PR if policy checks or tests fail.

## Agent responsibilities

- **Jules (Release Captain)**: sets promotion criteria, final gate thresholds, and release decision authority.
- **Codex (Implementation Agent)**: maintains workflow logic, policy gate implementation, and evidence schema contracts.
- **Observer (Feedback Agent)**: consumes completion events, routes operational signals, and closes governance feedback loops.

## Evidence and compliance model

The evidence bundle schema is defined at `evidence/schema.json` with mandatory fields:

- `build_id`
- `commit_sha`
- `policy_results`
- `test_results`
- `provenance`
- `timestamp`

This bundle supports auditability by linking what ran (`test_results`), what was enforced (`policy_results`), and where it ran (`provenance`) to a single commit.

## Observer loop closure

`notifyObserver(event)` currently writes a deterministic local audit stub and marks integration TODOs for:

- Slack webhook notification
- IntelGraph event ingestion
- Dedicated audit-log persistence

This keeps the interface stable while external dependencies remain intentionally constrained.

## MAESTRO alignment

- **MAESTRO Layers**: Foundation, Tools, Observability, Security.
- **Threats Considered**: gate bypass, policy drift, evidence tampering, silent test regressions.
- **Mitigations**: PR-blocking enforcement, evidence artifact upload, explicit policy result capture, observer event emission.
