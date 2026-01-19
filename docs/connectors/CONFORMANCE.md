# Connector Conformance Checklist

> [!IMPORTANT]
> For the automated verification suite and certification tiers (Bronze/Silver/Gold), see the [Conformance Test Plan](./CONFORMANCE_TEST_PLAN.md).

This checklist codifies the expectations for any connector contributed to the platform. It is intended to be **actionable**, enforceable through automated harness tests, and evidence-friendly for audits.

## Idempotency

- **Create/Update operations** MUST accept a client-supplied idempotency key or deterministic payload hash and reuse the same remote identifier when retried.
- **Side effects** (notifications, webhooks, secondary writes) MUST not be duplicated when the same request is replayed.
- **Deletes** should be safe to repeat and return a consistent terminal status.
- Provide evidence showing request identifiers, resulting resource IDs, and that repeated calls do not create duplicates.

## Retries

- Clearly mark **retryable vs. terminal errors** using structured error codes.
- Implement exponential backoff defaults and respect `Retry-After` style hints when present.
- Surface **attempt count** and **last error** in logs/metrics so operators can validate behavior.
- Provide evidence that transient failures succeed after retry while non-retryable errors short-circuit quickly.

## Pagination

- Support cursor-based pagination where possible; offset pagination must document risks.
- Return **stable ordering** for the duration of a sync window and include a **next cursor/token** until completion.
- Page sizes should be configurable; connectors must not silently truncate below the requested size.
- Provide evidence showing complete traversal with no missing/duplicate items across pages.

## Rate Limits

- Detect provider rate limits proactively (headers or error responses) and propagate structured rate-limit metadata (limit, remaining, reset).
- Enforce **client-side throttling** to stay under provider quotas and avoid cascading failures.
- Provide evidence of graceful backoff when approaching or exceeding limits, including reset handling.

## Error Mapping

- Normalize provider-specific errors into platform-standard codes (e.g., `UNAUTHORIZED`, `NOT_FOUND`, `RATE_LIMIT`, `TRANSIENT`, `VALIDATION`).
- Include HTTP status (when relevant), retryability hints, and user-actionable messages.
- Provide evidence that mapped errors preserve original context while remaining redaction-safe.

## Evidence Completeness

- Capture execution metadata: timestamps, connector version, request identifiers, and the set of conformance checks exercised.
- Store **coverage flags** for idempotency, retries, pagination, rate limits, error mapping, and redaction, with pass/fail status.
- Evidence artifacts should be exportable for audits and traceable back to specific runs.

## Redaction

- Strip or mask secrets (tokens, passwords, API keys, OAuth refresh tokens, `Authorization` headers) from logs, errors, and evidence artifacts.
- Avoid logging full payloads when they may contain PII; prefer structured summaries and hashes.
- Provide evidence demonstrating that sensitive fields are consistently redacted across nested structures and arrays.
