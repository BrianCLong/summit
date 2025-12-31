# ISO/IEC 27001 Gap Analysis

| Area                                  | Gap                                                                            | Mitigation / Plan                                                                                                                             | Status                                   |
| ------------------------------------- | ------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| Unified audit log coverage            | Same as SOC 2: provenance sink not yet enforced everywhere.                    | Roll out platform-wide sink enforcement and drift checks; tracked as GA blocker C2.                                                           | Open.                                    |
| Supplier due diligence evidence       | Supplier controls rely on policy text without attached attestations.           | Attach cloud provider SOC/ISO attestations to evidence bundle (customer-supplied if needed); document shared responsibility in `PROFILES.md`. | Planned.                                 |
| Data retention configuration evidence | Retention defaults are documented but not exported as configuration snapshots. | Export active profile configuration JSON and environment flags per bundle; fail-closed if retention disabled.                                 | Planned.                                 |
| Backup/restore drills                 | Runbooks exist but drill evidence is sparse.                                   | Capture quarterly drill outputs and include in evidence export.                                                                               | Planned.                                 |
| Security training records (A.6)       | Not captured in codebase.                                                      | Document expectation as complementary control for customers; mark as out-of-scope in evidence index.                                          | Risk accepted (customer responsibility). |

## Risk Acceptance

- Personnel security and training controls are treated as customer/reseller responsibilities; clearly flagged in profiles and evidence index.
- Physical security remains a cloud-provider control; attach provider attestations rather than duplicating controls.
