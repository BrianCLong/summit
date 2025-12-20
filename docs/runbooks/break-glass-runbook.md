# Break-Glass Access Runbook

This runbook describes how to request, approve, use, and audit temporary break-glass access issued by the AuthZ Gateway.

## Requesting Elevation

1. Authenticate normally and obtain a baseline session token.
2. Submit a request:
   - **HTTP**: `POST /access/break-glass/request`
   - **Headers**: `Authorization: Bearer <base token>`
   - **Body**:
     ```json
     {
       "justification": "Why elevation is required",
       "ticketId": "INC-12345",
       "scope": ["break_glass:elevated"]
     }
     ```
   - Responses:
     - `201` with `{ requestId, status, scope }` when accepted.
     - `400` if justification or ticketId is missing.
3. The request is persisted to `break-glass-state.json` and an audit entry is emitted to `audit.log`.

## Approving Elevation

1. Approvers must present a high-assurance token (`acr=loa2`). Use WebAuthn step-up or another approved method to elevate before approving.
2. Approve the request:
   - **HTTP**: `POST /access/break-glass/approve`
   - **Headers**: `Authorization: Bearer <loa2 token>`
   - **Body**:
     ```json
     {
       "requestId": "<from request step>"
     }
     ```
   - Responses:
     - `200` with `{ token, expiresAt, scope }` on approval.
     - `404` if the request does not exist.
     - `409` if already approved.
3. Approval emits audit + event entries and updates `break-glass-state.json` with the approver, expiry, and request linkage.

## Using the Elevated Token

- Send the issued token as `Authorization: Bearer <token>` when calling protected endpoints (for example, `/protected/*`).
- All actions still pass through ABAC/OPA policy evaluation with the break-glass context attached to the decision input.
- Every use is logged to `audit.log` and `break-glass-events.log` with the request ID and ticket ID.
- Tokens are **single-use** and **non-renewable**. A second attempt with the same token returns `401`.

## Expiry Behavior

- Tokens are short-lived (configurable via `BREAK_GLASS_TTL_SECONDS`, default 15 minutes) and have immutable expirations.
- Expired tokens return `401 session_expired` and trigger an expiry event in `break-glass-events.log` plus an audit record in `audit.log`.
- Expiration does not renew the original request; a new request must be submitted after expiry.

## Auditing and Persistence

- Persistent state: `break-glass-state.json` tracks requests, approvals, expirations, and usage counts.
- Event stream: `break-glass-events.log` records request, approval, usage, and expiry events for downstream ingestion.
- Audit log: `audit.log` stamps all break-glass actions with justification, ticket ID, approver, and expiry metadata.
- Recommended monitoring:
  - Alert on repeated request denials or frequent expiries.
  - Forward `break-glass-events.log` to SIEM for correlation with production incidents.
