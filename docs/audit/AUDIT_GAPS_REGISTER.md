# Audit Gaps Register (No Remediation)

| Gap                                                      | Impact | Artifact Affected                  | Owner Role               | Recommended Next Action                                              | Blocks External Diligence |
| -------------------------------------------------------- | ------ | ---------------------------------- | ------------------------ | -------------------------------------------------------------------- | ------------------------- |
| PR merge ledger has “Deferred pending PR number” entries | Medium | PR_MERGE_LEDGER.md                 | Release Manager          | Backfill ledger with definitive PR identifiers and approver records. | No                        |
| Explicit data retention policy not found in controls set | High   | COMPLIANCE_CONTROLS.md             | Compliance Lead          | Add retention/expiration control mapping and evidence pointer.       | Yes                       |
| Ops cadence schedule not centralized in runbooks         | Medium | RUNBOOKS/                          | Operations Lead          | Create a single cadence index with on-call and review rhythm.        | No                        |
| Extension governance approval workflow not explicit      | Medium | plugin-manifest.json / extensions/ | Platform Governance Lead | Document approval and exception workflow for extensions.             | Yes                       |
