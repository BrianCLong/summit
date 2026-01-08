# MVP-4 Stabilization Issuance Worksheet

**Source:** `docs/releases/MVP-4_POST_GA_STABILIZATION_PLAN.md`
**Owner:** Release Captain
**Last Updated:** 2026-01-08

This worksheet tracks the P0/P1 stabilization items defined in the stabilization plan.
All items marked DONE must have a corresponding Evidence Link.

| ID      | Title                              | Priority | Status | Owner           | Ticket             | Evidence Link                          |
| :------ | :--------------------------------- | :------- | :----- | :-------------- | :----------------- | :------------------------------------- |
| ISS-001 | TypeScript test errors             | P0       | DONE   | Engineering     | GA_DECISIONS.md #1 |                                        |
| ISS-002 | Full `make ci` run parity          | P0       | DONE   | Release Captain | GA_EVIDENCE_INDEX  |                                        |
| ISS-003 | Security scan execution            | P0       | DONE   | Security        | GA_EVIDENCE_INDEX  |                                        |
| ISS-004 | SBOM generation                    | P0       | TODO   | Security        | GA_EVIDENCE_INDEX  |                                        |
| ISS-005 | Load tests (k6) blocked            | P1       | TODO   | SRE             | Environment issue  |                                        |
| ISS-006 | Sign-offs capture                  | P1       | DONE   | Release Captain | N/A                |                                        |
| ISS-007 | API determinism audit              | P0       | TODO   | Engineering     | N/A                |                                        |
| ISS-008 | Enable `pnpm audit` in CI          | P0       | DONE   | Engineering     | N/A                | stabilization-evidence/EVIDENCE_ISS-008.md |
| ISS-009 | Implement error budgets            | P0       | TODO   | SRE             | N/A                |                                        |
| ISS-010 | Zero P0 incidents check            | P0       | DONE   | Release Captain | N/A                |                                        |
