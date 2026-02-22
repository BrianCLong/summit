# Bombadil-Inspired UI Fuzz Probe — Data Handling

## Summit Readiness Assertion
This data-handling guide enforces readiness requirements for deterministic, compliant UI probing. See `docs/SUMMIT_READINESS_ASSERTION.md` for readiness posture and evidence expectations.

## Purpose
Define privacy, redaction, and retention rules for UI fuzz probe artifacts and logs.

## Data Classification
- **Potentially sensitive**: DOM text, cookies, Authorization headers, localStorage/sessionStorage values, query params that look like tokens.
- **Operational metadata**: action traces, timings, navigation counts, determinism hashes.

## Never-Log List
- Cookies and `Authorization` headers.
- localStorage/sessionStorage values.
- Full DOM text dumps.
- Query params matching token-like patterns.
- Raw input values typed during fuzzing.

## Redaction Rules
- Redact token-like patterns in any logged URL or error.
- Never log values for the keys listed above.
- Default logging should be structural metadata only.

## Retention
- CI artifacts follow GitHub Actions retention defaults unless explicitly archived.
- Local developer runs should clean `artifacts/ui_fuzz/` between sessions.

## Allowed Outputs
- `report.json`: summary of violations (no sensitive content).
- `metrics.json`: timing, action counts, trace bytes.
- `stamp.json`: deterministic hash-only stamp (no timestamps).
- `trace.ndjson` (optional): structural trace events with redacted payloads.

## Threat-Informed Requirements
- Deny-by-default allowlist enforcement.
- Redaction tests for token patterns.
- Deterministic seed and bounded actions to avoid data exfiltration via logs.

## MAESTRO Threat Modeling (Required)
- **MAESTRO Layers**: Data, Tools, Observability, Security.
- **Threats Considered**: data leakage in logs, prompt injection via DOM content, uncontrolled external navigation.
- **Mitigations**: never-log list, allowlist enforcement, redaction tests, deterministic bounds.
