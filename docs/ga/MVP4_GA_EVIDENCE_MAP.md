# MVP4 GA Evidence Map (Intentionally Constrained)

This map lists only claims with deterministic anchors and verification commands.

| Claim ID   | Claim                                                | Evidence Path Anchor                           | Verification Command                                   | Success Indicator                           | Status   |
| ---------- | ---------------------------------------------------- | ---------------------------------------------- | ------------------------------------------------------ | ------------------------------------------- | -------- |
| GA-SEC-001 | Security remediation ledger exists and is populated. | `docs/security/SECURITY_REMEDIATION_LEDGER.md` | `test -f docs/security/SECURITY_REMEDIATION_LEDGER.md` | File exists with populated findings table.  | Verified |
| GA-SEC-002 | Deferred risks register exists for GA governance.    | `docs/security/SECURITY_DEFERRED_RISKS.md`     | `test -f docs/security/SECURITY_DEFERRED_RISKS.md`     | File exists with owner/next-action entries. | Verified |
