# Break-glass Access Runbook

This runbook describes how to request, approve, use, and audit short-lived break-glass elevation through the AuthZ Gateway.

## Requesting access

1. Authenticate normally and obtain a base session token.
2. Submit `POST /access/break-glass/request` with:
   - `justification` (why elevation is required)
   - `ticketId` (incident/change tracking ID)
   - Optional `scope` overrides; defaults to `break_glass:elevated`.
3. A `201` response returns the `requestId` and requested scope. Requests without both `justification` and `ticketId` are rejected with `400 justification_and_ticket_required`.

## Approving requests

1. Approvers must be authenticated at ACR `loa2` and authorized for `break-glass:approve`.
2. Call `POST /access/break-glass/approve` with the `requestId` from the requester.
3. On success, the gateway issues a **single-use**, **non-renewable** break-glass token scoped to the requested permissions and returns `expiresAt`.
4. Tokens carry immutable expiry timestamps and are not extendable or re-issuable after expiration.

## Using elevated tokens

- Present the issued token to protected endpoints (e.g., `GET /protected/...`).
- All requests continue to flow through OPA/ABAC enforcement. Break-glass does **not** bypass policy checks.
- Every action is stamped with the originating break-glass metadata for auditing and policy context.
- Tokens are marked used on first validation; reuse attempts return `401 session_expired`.

## Expiry behavior

- Default TTL is 15 minutes (configurable via `BREAK_GLASS_TTL_SECONDS`).
- The gateway sweeps and expires approved sessions once their `expiresAt` timestamp is reached. Expired requests cannot be approved or renewed; a new request must be created.

## Auditing and event trail

- Structured audit entries are written to `audit.log` for requests, approvals, expirations, and each usage attempt, including the break-glass context (request ID, ticket ID, justification, approver).
- Break-glass lifecycle events are appended to `break-glass-events.log` for request, approval, usage, and expiry. These logs serve as the authoritative trail for compliance review.

## Troubleshooting

- **Missing justification/ticket:** Request rejected with `400 justification_and_ticket_required`.
- **Expired token:** API responses return `401 session_expired` and the corresponding request is marked `expired`.
- **OPA denial:** The gateway returns `403` (or step-up obligations) even for elevated tokens when policy denies access; review OPA decision logs alongside `break-glass-events.log`.
