# Switchboard Approvals + Command Palette API

## Overview
This API provides policy-gated command execution, approvals, timeline entries, and receipt verification for Switchboard.

## Endpoints
- `POST /commands/execute` — Command preflight + enqueue.
- `POST /approvals/{id}:decide` — Approve or deny with rationale.
- `GET /timeline` — Timeline entries by tenant/actor/entity.
- `GET /receipts/{id}` — Receipt lookup.
- `POST /receipts:verify` — Verify receipt signatures.
- `POST /policy/simulate` — Policy simulation for “Why blocked?”.

## Idempotency
Requests to execute and decide require `Idempotency-Key` for dedupe and replay safety.

## Receipt Verification
Receipt verification returns `valid` and a reason when invalid. Receipts are signed and link to policy decisions.

## Schema References
- `openapi/switchboard-approvals-command-palette.yaml`
- `provenance/receipt_schema_switchboard_v0_1.json`
