# Customer Support Mode

## Principles
- Scoped access: time-bound, tenant-bound, and minimal permissions.
- Dual control: sensitive actions require approval + step-up authentication.
- Auditability: every action emits an audit log and is visible to the customer.
- Data handling: redaction by default; exports require explicit approval and policy checks.

## Workflow
1. Support requests access by creating a ticket; approver issues a signed support token with tenant scope and expiry.
2. Support UI/CLI prototype resides in `tools/security/support-mode/cli.sh` for generating session tokens and viewing logs.
3. All access appears in customer-facing audit feed; logs stored in `tools/security/support-mode/audit.log`.
4. Dual control enforced by requiring both the support token and step-up MFA assertion before executing sensitive operations.

## Acceptance
- Support can diagnose a tenant issue using redacted views without accessing restricted data.
- Every access is logged and reviewable by the tenant via the audit feed.
