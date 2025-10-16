# ADR-027: Offline Hardening with Background Sync

**Status:** Proposed

## Context

While Service Worker (SW) caching provides offline read capabilities, write operations (mutations) fail when the user is offline. For non-critical, idempotent writes, we can improve the user experience by queueing these requests and retrying them when the network is available.

## Decision

We will use Workbox's `background-sync` module to implement a background sync queue for specific, safe mutations.

1.  **Scope**: This will initially be limited to notification subscription updates (`/api/maestro/v1/subscriptions`). These are non-critical and idempotent.
2.  **Implementation**: A dedicated SW fetch handler will catch failed `POST`/`PATCH`/`DELETE` requests to the subscriptions endpoint. If the failure is due to a network error, the request will be pushed onto a `workbox-background-sync` queue.
3.  **Retry Policy**: The queue will automatically retry sending the requests with exponential backoff when the browser detects that network connectivity has returned.
4.  **User Feedback**: The UI will provide optimistic feedback and inform the user that their change has been queued and will sync when they are back online.

## Consequences

- **Pros**: Improved UX for users on unreliable networks. Changes are not lost.
- **Cons**: Adds complexity. Only suitable for non-transactional, idempotent operations. Requires careful state management in the UI to reflect the queued status.
