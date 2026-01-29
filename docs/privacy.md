# Privacy Guardrails

## Data Classifications

* `PUBLIC`: Information safe for public release.
* `INTERNAL`: Information for internal use only.
* `CONFIDENTIAL`: Sensitive business information.
* `RESTRICTED`: Highly sensitive data (PII, secrets).

## Retention Policy

* **Evidence Artifacts**: Retained indefinitely for audit (unless purged by compliance request).
* **Logs**: Retained for 30 days.
* **Cache**: TTL configurable, max 24 hours.

## Never-Log Fields

The following fields must NEVER appear in logs or unredacted traces:
* `token`, `secret`, `password`, `key`, `auth`, `credential`
* `api_key`, `access_token`, `refresh_token`, `session_id`
* `pii`, `email`, `phone`, `ssn`

## Enforcement

The `packages.common.privacy.PrivacyGuard` class provides `ensure_safe_for_logging()` which strictly enforces redaction of the above fields. All services must use this before emitting logs containing arbitrary payloads.
