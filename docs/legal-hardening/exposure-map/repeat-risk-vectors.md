# Repeat-Risk Vectors

This document identifies technical patterns and vectors that repeatedly introduce legal risk.

## 1. Authentication & Authorization

- **Weak Auth:** Single-factor authentication for admin portals allows account takeovers (ATOs), leading to negligence claims.
- **Shared Credentials:** "Dev" or "Service" accounts shared among team members break attribution chains (spoliation of evidence).
- **Scope Creep:** Oauth tokens requesting more permissions than needed (privacy violation, platform policy violation).

## 2. Third-Party Integrations

- **Data Leakage:** Sending PII to analytics/marketing vendors (Google Analytics, Facebook Pixel) via URL parameters or unmasked payloads.
- **Subprocessor Management:** Adding new vendors without updating DPA/Privacy Policy (GDPR violation).
- **Dependency Vulnerabilities:** Using outdated libraries with known CVEs (negligence).

## 3. Data Exports & Logging

- **Unlogged Exports:** "Download CSV" buttons that don't generate an audit log entry make it impossible to prove _who_ took the data.
- **Logging Gaps:** Failure to log _read_ access to sensitive records (only logging writes) hampers investigation.
- **Over-Logging:** Logging PII/Secrets (passwords, keys) into plain-text logs (breach risk).

## 4. Operational Gaps

- **Stale Access:** Failure to offboard employees/contractors immediately.
- **Production Access:** Developers having write access to production DBs (insider threat, data integrity risk).
- **Configuration Drift:** Security settings (e.g., S3 bucket permissions) reverting to insecure defaults during deployments.

## 5. Mitigation Strategies

- [ ] **Automated Secret Scanning:** Block commits with credentials. (Implemented: `scan_pii_candidates.ts` is a start).
- [ ] **Egress Filtering:** Monitor and alert on large data exports.
- [ ] **Just-In-Time (JIT) Access:** Eliminate standing admin access; require temporary elevation with reason codes.
