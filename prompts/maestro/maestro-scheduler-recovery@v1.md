# Prompt: Maestro Scheduler Recovery & MCP Governance Hardening (v1)

## Objective

Harden Maestro scheduler recovery and MCP governance by adding queued-run recovery, enqueue
idempotency, and documented control-plane guardrails without expanding privilege surface.

## Scope

- Update Maestro scheduler recovery to rehydrate queued runs with bounded batch limits.
- Add enqueue deduplication to prevent duplicate assignments.
- Ensure run updates correctly persist executor assignments.
- Document scheduler recovery and MCP governance guardrails.
- Update roadmap status metadata to reflect the change.

## Non-Goals

- No changes to policy engines or governance rules.
- No new external integrations or data sources.
- No changes to UI components.

## Required Outputs

- Code changes in `server/src/maestro` for recovery, dedupe, and run updates.
- Documentation updates in `docs/maestro/EXECUTION_PLAN.md`.
- Roadmap status update in `docs/roadmap/STATUS.json`.
- Prompt registry entry and prompt file metadata.

## Verification

- Add or update unit tests for scheduler recovery/queue behavior where feasible.
- Ensure no secrets or credentials are introduced.
