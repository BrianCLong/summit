# Agentic Eval Harness Plan

A minimal, repeatable harness for validating multi-agent workflows and regressions.

## Objectives

- Capture golden traces for representative runs (success, policy_denied, redaction_block, budget_exceeded).
- Replay traces to confirm determinism of policy decisions, receipts, and redaction outcomes.
- Provide regression assertions for budgets, latency, and failure taxonomy coverage.

## Components

- **Trace collector**: Records spans with agent ID, tool, policy decision, handles, budgets, channel type.
- **Trace store**: Versioned golden traces stored under `tests/agentic/golden/`.
- **Replayer**: Deterministic runner that replays traces against current policies/adapters.
- **Assertions**: Verify policy decisions, receipts, redaction results, budgets, and outputs (where deterministic).
- **Reporting**: Emit summary with pass/fail counts and diff vs previous runs.

## Workflow

1. Run target network spec with instrumented adapters to capture golden traces.
2. Normalize traces (strip volatile IDs, keep handles as opaque tokens).
3. Store traces as fixtures with metadata: spec version, policies, model routes, timestamp.
4. Replay traces in CI using the current codebase and compare decisions/receipts.
5. Fail CI if policy decisions diverge, receipts missing, or budgets exceeded vs baseline.

## Example checks

- Policy decisions unchanged for each tool call.
- Redaction masks stable and present for marked fields.
- Secret handles resolved only within scope/TTL.
- Token/time budgets not exceeded for the same inputs.
- Failure taxonomy codes emitted for expected negative cases.

## Extensibility

- Support pluggable exporters (OTLP, file) for traces.
- Allow per-network assertion configs to accommodate deliberate changes.
- Include hooks for chaos testing (latency injection, partial tool failure) to ensure policies still gate execution.
