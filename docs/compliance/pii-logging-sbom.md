# PII Logging Controls and SBOM Compliance Evidence

## Policy Summary

- **PII guard middleware** now scans inbound requests and outbound responses for high-confidence PII/financial/sensitive patterns using the privacy recognizer library.
- Detected payloads are **redacted for logging** using a policy mask so that request/response previews written to structured logs omit raw identifiers.
- Redaction summaries are tagged with tenant context and detector metadata only (no raw values) to support auditability without exposing sensitive data.
- SBOM generation is coupled with **license compliance scanning** and will **fail the CI pipeline** if forbidden or critical license issues are detected.

## Operational Evidence

- **Runtime enforcement:** `server/src/middleware/pii-guard.ts` is registered in `server/src/app.ts` immediately after JSON parsing and sanitization to ensure all routes benefit from detection and log-safe redaction.
- **Automated verification:** Unit coverage in `server/src/middleware/__tests__/pii-guard.test.ts` asserts that PII findings are redacted and that response previews exclude raw values while leaving runtime payloads untouched.
- **CI gates:** `.github/workflows/ci.yml` now adds a Trivy-backed SBOM license scan (`sbom` job) that exits non-zero on HIGH/CRITICAL license issues and publishes SBOM + SARIF artifacts for evidence.

## How to Validate

1. Trigger the `CI` workflow (push/PR). The `sbom` job will generate `sbom.json`, run Trivy with license scanning, and fail on violations while persisting artifacts.
2. Exercise any API path locally; log entries will include `piiScan` metadata with redacted previews only. No raw identifiers should appear in server logs.
3. Run `pnpm --filter intelgraph-server test -- pii-guard` to execute the middleware tests if you need local validation.

## Change Management

- Violations detected by the SBOM license scan or by the PII guard logging will be treated as **build blockers** per repository governance.
- Evidence artifacts (SBOM, license SARIF) are automatically uploaded by CI for audit collection; retain them according to `docs/compliance/evidence_collection.md`.
