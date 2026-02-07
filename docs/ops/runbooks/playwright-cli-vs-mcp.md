# Runbook: Playwright CLI vs MCP Skill Execution

## Readiness Assertion

This runbook is aligned with `docs/SUMMIT_READINESS_ASSERTION.md` and governs deterministic Playwright CLI/MCP operations.

## Purpose

Provide operational guidance for Playwright CLI skill execution with deterministic evidence outputs and MCP compatibility.

## Preconditions

- Playwright CLI dependency installed.
- Feature flag remains OFF by default and must be explicitly enabled per environment.
- Evidence bundle validation available in CI.

## Common Failure Modes

1. Missing browser dependencies
   - Symptom: Playwright CLI fails during launch.
   - Resolution: Install required browsers or use the prebuilt image with dependencies.

2. Selector flakiness
   - Symptom: `check` or `click` steps fail intermittently.
   - Resolution: Replace with deterministic selectors, add wait conditions, reduce race conditions.

3. Sandbox/permissions issues
   - Symptom: Browser launch or filesystem output failures.
   - Resolution: Confirm CI container permissions and artifact output path allowlists.

## Operational Checks

- Verify allowlisted domains and command schemas are intact.
- Validate evidence bundle outputs and determinism checks.
- Confirm artifact budgets remain within runtime, memory, and size limits.

## Escalation Path

- Raise a governance defect if evidence outputs violate determinism or data handling rules.
- Reference `docs/ops/EVIDENCE_VERIFIER.md` for evidence validation guidance.

## Monitoring & Alerts

- Track nightly run success rate and evidence validation failures.
- Alert on drift in CLI command surface hashes or repeated selector failures.

## Rollback Plan

- Disable the feature flag for CLI execution.
- Revert to MCP-only runs for affected pipelines.

## Decision Posture

- CLI execution is the deterministic default when enabled.
- MCP compatibility remains available as a constrained fallback.

