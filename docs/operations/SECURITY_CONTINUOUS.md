# Security & Compliance Maintenance

Security hygiene is routine, measurable, and auditable. Controls are expressed as policy-as-code, and evidence is regenerated on cadence to prevent drift.

## Routine Security Hygiene

- **Dependency review (weekly):** Scan for vulnerabilities; apply upgrades; record risk acceptance with expiry when deferred.
- **Secrets rotation checks (monthly):** Verify rotation cadence per secret class; ensure short-lived tokens; validate zero secrets in repos.
- **Access review (monthly):** Reconcile RBAC vs least privilege, remove dormant accounts, validate break-glass accounts and logging.
- **Surface reduction:** Disable unused endpoints/features; enforce mTLS and TLS baselines; validate CSP and CORS policies.

## Compliance Refresh

- **Evidence regeneration (monthly):** Re-run control checks, collect attestations/logs, and store in evidence catalog with timestamps.
- **Drift alerts on controls:** Use policy-as-code to alert on config drift (e.g., IaC diff, policy evaluation failures, missing audit logs).
- **Runbook alignment:** Each control has an owner, test, and remediation play; ensure updates are reflected in runbooks.

## Reporting & Escalation

- Weekly summary of new findings, remediations, and exceptions sent to security council.
- High/critical findings trigger immediate advisory to incident channel with containment steps and rollback guidance.
- Track Mean Time to Remediate (MTTR) for security issues; target continuous reduction with quarterly goals.
