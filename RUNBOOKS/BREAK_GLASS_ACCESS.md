# Break-Glass Access Runbook

## Purpose

Document the operational process for requesting, approving, and auditing temporary break-glass elevation through `authz-gateway`.

## Request Flow

1. **Authenticate:** Obtain a standard token via `/auth/login`.
2. **Submit request:**
   - Endpoint: `POST /access/break-glass/request`
   - Payload: `{ "justification": "<why>", "ticketId": "<INC/JIRA>", "scope": ["break_glass:elevated"] }`
   - Requirements: `justification` and `ticketId` are mandatory; scope defaults to `break_glass:elevated`.
3. **Persistence:** Requests are stored on disk (`break-glass-state.json`) with status `pending` until approval.
4. **Audit event:** A `request` event is appended to `break-glass-events.log` and an audit entry is written.

## Approval Flow

1. **Elevate approver session:** Approver must already be at `loa2` (use `/auth/step-up` if needed).
2. **Approve request:**
   - Endpoint: `POST /access/break-glass/approve`
   - Payload: `{ "requestId": "<id>" }`
   - Output includes a short-lived token, `expiresAt`, `sid`, and flags `immutableExpiry=true`, `singleUse=true`.
3. **Policy enforcement:** All downstream calls using the break-glass token still traverse standard ABAC/OPA checks and will be denied if policy blocks the action.
4. **Scope and constraints:** The issued token carries elevated scope but cannot be renewed, extended, or reused after first consumption.
5. **Audit event:** An `approval` event is logged with expiry metadata.

## Usage & Expiry

- **Single use:** Break-glass tokens are consumed on first successful authorization attempt; subsequent calls return `401 session_expired`.
- **Immutable expiry:** TTL is fixed at issuance (default 15 minutes, configurable via `BREAK_GLASS_TTL_SECONDS`) and cannot be extended.
- **Expiry handling:** When TTL elapses, the session is marked `expired`, an `expiry` event is written, and the audit log records the expiration.
- **OPA/ABAC:** Each protected call logs a `usage` event with the break-glass context and is evaluated by OPA with the break-glass metadata present.

## Auditing & Observability

- **Event log:** `break-glass-events.log` records `request`, `approval`, `usage`, and `expiry` entries with timestamps, ticket IDs, and request IDs.
- **State file:** `break-glass-state.json` tracks lifecycle metadata, approver, expiry, and usage counts for each request.
- **Audit log:** Standard audit pipeline captures `break_glass_requested`, `break_glass_approved`, `break_glass_usage`, and `break_glass_expired` actions for SIEM ingestion.
- **Runbook verification:** For investigations, correlate `sid` from approval output with audit events to trace all actions performed during elevation.

## Operational Notes

- **Denials:** Missing justification or ticket ID results in `400 justification_and_ticket_required`; approving an unknown ID returns `404 request_not_found`.
- **Policy failures:** If OPA denies during break-glass usage, the request is logged as `usage` with `allowed=false` and the HTTP response is `403`.
- **Revocation:** Manual revocation can be performed via `sessionManager.expire(sid)` (for ad-hoc mitigation) followed by checking `break-glass-events.log` for expiry confirmation.
