# Security Chaos Drills Catalog

This catalog defines repeatable, low-impact drills that simulate common attack paths. All drills default to non-production environments and are tuned to avoid data mutation.

## Operating Rules

- **Environments:** default to `dev` or `preprod`. Running against production requires the `--allow-prod` flag and security sign-off.
- **Rate limits:** respect configured thresholds; the harness hardcodes conservative request counts and delays.
- **Data safety:** only synthetic credentials/API keys are used. Drills must not modify customer data.
- **Logging:** ensure security telemetry is collected in both application logs and the SIEM (if connected).

## Drill Definitions

### DRILL-001: Brute-force login detection
- **Preconditions**
  - Test account exists with known email/username but unknown password.
  - Authentication service exposes an `/api/auth/login` endpoint.
  - Rate limiting and alerting are enabled for repeated failed logins.
- **Steps**
  1. Attempt 5 login attempts within 15 seconds using the same username and random passwords.
  2. Observe responses for authentication failure and throttling behavior.
  3. Verify that security alerts and logs capture the burst of failures.
- **Expected Behavior**
  - HTTP `401` or `403` on each attempt; `429` should trigger after policy threshold.
  - SIEM/log entries showing failed login attempts with source IP and username.
  - Alert/notification routed to the SOC or on-call channel when brute-force threshold crossed.

### DRILL-002: Mass graph scraping attempt
- **Preconditions**
  - Graph APIs or search endpoints (e.g., `/api/graph/search`) enforce pagination and authz.
  - An account with least-privilege access for testing exists.
  - WAF/rate limits configured for repeated high-volume reads.
- **Steps**
  1. Issue 3–5 rapid queries requesting large page sizes (e.g., `limit=1000`).
  2. Observe throttling or access controls preventing large unpaged exports.
  3. Confirm telemetry captures the burst read behavior.
- **Expected Behavior**
  - HTTP `403` for unauthorized access or `429`/`400` if pagination limits exceeded.
  - WAF/rate limit counters increment; responses include safe error bodies.
  - Audit logs for graph queries with request metadata (actor, query params).

### DRILL-003: Misconfigured API key abuse
- **Preconditions**
  - API supports key-based authentication on `/api/keys` or admin data endpoints.
  - Rotate or provision a deliberately scoped “test-only” key with minimal permissions.
  - Monitoring in place for key misuse (revocation events, anomaly detection).
- **Steps**
  1. Call a privileged endpoint using the low-scope test key.
  2. Attempt a second call with a malformed or revoked key to verify rejection.
  3. Capture log entries and alerts for invalid or over-privileged usage.
- **Expected Behavior**
  - HTTP `401`/`403` for malformed or unauthorized keys; optional `429` if repeated.
  - SIEM entries tagging key ID, source IP, and failure reason.
  - Alert to key owners or security channel on misuse detection.

### DRILL-004: LLM prompt-injection attempt on admin flows
- **Preconditions**
  - LLM-backed admin assistants or workflows exposed via `/api/admin/llm` or similar.
  - Safety filters, audit logging, and output validation are enabled.
  - A non-production admin/test account is available.
- **Steps**
  1. Submit an adversarial prompt instructing the model to exfiltrate sensitive data.
  2. Provide crafted system and user messages attempting to override guardrails.
  3. Observe response sanitization and log entries for blocked content.
- **Expected Behavior**
  - HTTP `400`/`422` with sanitized error messaging; guardrails prevent execution.
  - LLM safety logs emitted (prompt hash, policy decision, blocked category).
  - Alert or metric increment for prompt-injection attempts targeting admin surfaces.

## Reporting

- Harness writes reports to `drills/security-report-<timestamp>.md`.
- Each report includes per-drill pass/fail/skip status, observed responses, and log checks.
- Attach reports to leadership/compliance updates; store artifacts in the security share.

## Extending the Catalog

- Add new drill definitions to this file and corresponding implementations in `scripts/security/run-drill.ts`.
- Keep request counts low and prefer read-only flows.
- Coordinate with the SOC before enabling production runs.
