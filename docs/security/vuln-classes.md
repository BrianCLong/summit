# Vulnerability Classes (Canonical)

This document defines _classes_ of vulnerabilities tracked in Summit.
Scanner findings are mapped to classes; only regressions open/update issues.

## Severity Rubric

| Severity | Definition | SLA         | Owner    |
| -------- | ---------- | ----------- | -------- |
| Critical | ...        | 48h         | security |
| High     | ...        | 7d          | security |
| Medium   | ...        | 30d         | team     |
| Low      | ...        | best-effort | team     |

## Class: ZAP-XSS-REFLECTED

**Description:** Reflected XSS via unsanitized output in web UI.
**Detectors:** OWASP ZAP, custom ESLint rule
**Remediation Primitive:** output encoding + CSP + input validation at boundary
**Acceptance:** tests + ZAP baseline clean + CSP report-only violations trending down
