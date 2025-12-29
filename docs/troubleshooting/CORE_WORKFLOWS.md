# Troubleshooting Guide - Core Workflows

Use this guide to quickly diagnose and resolve the most common production and
pre-production issues across ingestion, build validation, and authentication.

## Ingestion Pipeline

1. **Symptom:** Ingestion jobs stall with no records written.
   - **Checks:**
     - Confirm `INGESTION_QUEUE_URL` and `SOURCE_REGISTRY_URL` are set.
     - Verify Redis connectivity with `redis-cli PING` from the worker node.
     - Inspect worker logs for backpressure indicators (`429` or `retryAfter`).
   - **Fixes:**
     - Scale ingestion workers horizontally before retrying stuck batches.
     - Reduce batch size via `INGESTION_BATCH_SIZE` and redeploy.
     - Clear poison messages from the queue using `scripts/queue/cleanup.sh`.

2. **Symptom:** Schema validation errors after source updates.
   - **Checks:** Run `npm run schema:diff:strict` to detect breaking changes.
   - **Fixes:**
     - Add explicit transformation steps to map new fields.
     - Version the schema and gate new sources behind a feature flag until
       downstream consumers are updated.

## Build and Test Stability

1. **Symptom:** Local builds fail with missing toolchains.
   - **Checks:**
     - Execute `./src/cli/maestro-doctor.ts` to validate prerequisites.
     - Confirm `pnpm` is installed and matches `.tool-versions` guidance.
   - **Fixes:**
     - Run `make bootstrap` to install required toolchains.
     - Remove stale artifacts with `npm run cleanup` then rebuild.

2. **Symptom:** Flaky unit tests in CI.
   - **Checks:**
     - Re-run failing suites with `npm test -- --runInBand` to rule out race
       conditions.
     - Inspect recent dependency bumps in `CHANGELOG.md` for breaking changes.
   - **Fixes:**
     - Quarantine the suite with `test-quarantine` labels and open a follow-up
       issue.
     - Stabilize async tests by adding explicit timeouts and deterministic mocks.

## Authentication and Access

1. **Symptom:** Users receive `403` on authenticated API calls.
   - **Checks:**
     - Validate token scopes against `policy/` definitions.
     - Confirm clock skew is under 2 minutes using NTP or `chrony` status.
   - **Fixes:**
     - Regenerate client credentials and purge cached tokens.
     - Raise scope from `read` to `read:write` only when justified and logged.

2. **Symptom:** SSO redirects loop during login.
   - **Checks:**
     - Inspect IdP metadata expiration in `security/sso/metadata.xml`.
     - Ensure `CORS_ORIGIN` matches the front-end host in the environment.
   - **Fixes:**
     - Refresh IdP metadata and redeploy the auth gateway.
     - Reset session cookies and retry in a private browser window.

## Escalation

If remediation fails after two iterations, capture logs, relevant metrics, and
feature flag states, then escalate to the on-call SRE via the runbook in
`RUNBOOKS/oncall.md`.
