# End-to-End Replay System (Phase 1)

This document defines the initial replay system for capturing, storing, and replaying failed executions across IntelGraph and Maestro Conductor flows.

## Goals

- Capture enough context for failed requests/runs to deterministically replay them.
- Provide a simple runner to execute replays against dev/test environments.
- Promote stable replays into permanent regression tests.

## What We Capture

Each replay descriptor records:

- **Request payloads**: sanitized request body, headers (non-sensitive), and endpoint metadata.
- **User/tenant context**: tenant, case, purpose, and anonymized identifiers; user IDs are hashed when provided.
- **Feature flags and environment**: declared feature flags, relevant env vars (whitelisted), runtime version, and environment label (dev/test/staging).
- **Version info**: commit SHA/build ID when available, plus service/package version.
- **Error snapshot**: error class/message, status code, stack summary, and response payload when available.
- **Trace/correlation IDs**: requestId/traceId/spanId propagated from the caller when present.

## Storage Layout

Replay descriptors are JSON files under `replays/<service>/<id>.json`.

- IntelGraph query failures: `replays/intelgraph/<id>.json`
- Maestro run failures: `replays/maestro-conductor/<id>.json`
- Synthetic/fixtures for regression tests live alongside the folder they exercise.

Files are small (request + minimal metadata) and omit large attachments or streaming bodies.

## Privacy Guardrails

- **No secrets**: keys named like `authorization`, `cookie`, `token`, `secret`, `password`, `apiKey`, or `set-cookie` are stripped before writing.
- **PII scrubbing**: user identifiers are hashed and free-form text fields are truncated to 1KB.
- **Environment whitelist**: only opt-in env vars are persisted (e.g., `NODE_ENV`, `FEATURE_FLAG_SET`, build/commit IDs).
- **Redaction markers**: replay files include `privacy.piiScrubbed=true` plus notes that describe what was removed.
- **Write-only**: replay files are written locally; uploading outside the repo requires explicit approval.

## Capture Hooks (Phase 1)

- **IntelGraph query endpoint (Query Copilot sandbox)**
  - On Cypher validation/parse errors, capture the Cypher text, tenant/purpose, timeout, and dataset size.
  - Errors are labeled as `flow=intelgraph-cypher-sandbox` with the originating trace/request IDs when supplied.

- **Maestro run execution (Meta Orchestrator reference workflows)**
  - When a plan execution throws or finishes with any `failed` stage trace, capture the pipeline definition, stage overlays, plan metadata, and audit trail.
  - Errors are labeled as `flow=maestro-reference-workflow`.

## Replay Runner

`scripts/testing/run-replay.ts` accepts a replay JSON file and:

1. Restores the captured context (tenant/purpose, feature flags, environment hints).
2. Re-runs the scenario against local dev/test code paths (IntelGraph sandbox executor or Maestro reference workflow runner).
3. Compares current behavior to the original descriptor:
   - **PASS**: original failure now succeeds.
   - **FAIL**: behavior matches the original failure.
   - **DRIFT**: behavior changed but is not clearly fixed (different error or partial success).

The runner prints a human-readable summary and returns a non-zero exit code only on invalid input.

## Regression Tests

Stable replay descriptors can be promoted to `tests/replays/<id>.test.ts`.

- Tests should call `runReplay` and assert the expected classification.
- Synthetic fixtures can live under `replays/` and should be clearly labeled with `tags: ["synthetic"]`.

## Operational Notes

- Target deterministic flows first; avoid external systems that mutate state.
- Keep replay files under 1MB and avoid binary blobs.
- When adding new capture hooks, include the flow/service name, classification code, and the minimal fields needed to reconstruct the request in dev/test.
