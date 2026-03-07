# Break-Glass Access Runbook

## Overview

This runbook describes how to request, approve, and audit break-glass access through the AuthZ Gateway. Break-glass sessions provide short-lived elevated scopes with immutable expiry and single-use semantics. All activity continues to flow through standard ABAC/OPA enforcement and is stamped with break-glass context for auditability.

## Requesting Access

1. Authenticate normally to obtain a base session token.
2. Call `POST /access/break-glass/request` with:
   - `justification` (required): concise description of why break-glass is needed.
   - `ticketId` (required): incident or change record ID.
   - `scope` (optional): array of additional scopes to request; defaults to `break_glass:elevated`.
3. A pending request record is persisted with justification, ticket ID, scope, timestamp, and subject ID. An audit event of type `request` is emitted.

## Approving Access

1. Approvers must authenticate and step-up to ACR `loa2`.
2. Call `POST /access/break-glass/approve` with:
   - `requestId` (required): the ID returned by the request endpoint.
3. On approval, the gateway issues a single-use, non-renewable token bound to the requested scope. The token embeds break-glass metadata (request ID, ticket, justification, approver) and immutable expiry. Audit event `approval` is emitted and state is persisted.
4. If a grant expires (TTL elapsed or consumed), subsequent `/access/break-glass/approve` calls for the same `requestId` return `410 request_expired`—a fresh request is required.

## Using the Elevated Token

- Present the issued token to protected endpoints (e.g., `/protected/*`).
- All ABAC/OPA checks still run. Decisions include the break-glass context in the policy input and in audit entries.
- Every action logs an audit entry and emits a `usage` event with resource, action, tenant, and allow/deny outcome.
- Tokens are **single-use**: subsequent reuse returns `session_expired` and is recorded.
- Once consumed or expired, tokens cannot be reissued; create a new request for any additional access.

## Expiry Behavior

- Expiry is immutable; break-glass tokens cannot be extended or renewed.
- Expiration triggers an `expiry` event and audit entry when detected (during validation or startup pruning).
- Expired sessions are removed from the active set; new approvals must create a fresh request.

## Auditing and Persistence

- State is stored in `break-glass-state.json` (requests, approvals, expiry, usage counts).
- Event log `break-glass-events.log` records `request`, `approval`, `usage`, and `expiry` entries.
- Audit log `audit.log` captures subject, action, resource, tenant, reason, and break-glass metadata.
- For investigations, correlate `requestId` across event and audit logs to reconstruct the timeline.

## Operational Notes

- Keep `BREAK_GLASS_TTL_SECONDS` minimal (e.g., 5–15 minutes) to reduce exposure.
- Ensure OPA is reachable; if OPA denies, elevated tokens will still be blocked and logged.
- Review logs regularly for repeated break-glass usage or denied elevated attempts.
