# Repo Assumptions and Verification Ledger

This ledger records verified repository facts and declared assumptions for the open-graph lineage
and TwinGraph delivery track. Items stay marked as assumptions until inspection evidence is
captured. The Summit Readiness Assertion remains the governing authority.

## Verified

| Area                      | Evidence Command                                                                       | Result                                          | Notes                                                                |
| ------------------------- | -------------------------------------------------------------------------------------- | ----------------------------------------------- | -------------------------------------------------------------------- |
| Package manager           | `cat package.json`                                                                     | `pnpm@10.0.0` present                           | pnpm is authoritative for local and CI workflows.                    |
| Core scripts              | `cat package.json`                                                                     | `test`, `test:e2e`, `lint`, `typecheck` present | Baseline validation commands exist.                                  |
| Workflow gates            | `test -f .github/workflows/pr-quality-gate.yml`                                        | `yes`                                           | CI quality gate workflow exists.                                     |
| Workflow gates            | `test -f .github/workflows/ci-pr.yml`                                                  | `yes`                                           | PR workflow exists.                                                  |
| Workflow gates            | `test -f .github/workflows/ci-verify.yml`                                              | `yes`                                           | Verification workflow exists.                                        |
| Workflow gates            | `test -f .github/workflows/ci-security.yml`                                            | `yes`                                           | Security workflow exists.                                            |
| API/Agent/Connector paths | `test -d server/src/api && test -d server/src/agents && test -d server/src/connectors` | all `yes`                                       | Canonical implementation roots are under `server/src/*`.             |
| Legacy root-path mismatch | `test -d src/api/graphql && test -d src/api/rest`                                      | both `no`                                       | Original path map is outdated for API roots.                         |
| Graph lineage baseline    | `rg -n "lineage" src/data-pipeline server/src`                                         | matches found                                   | Existing lineage tracker and governance lineage usage already exist. |
| CODEOWNERS controls       | `sed -n '1,140p' CODEOWNERS`                                                           | owners defined for auth/policy/security/deploy  | High-risk paths are owner-gated.                                     |

## Assumed (Deferred pending verification)

| Area                         | Assumption                                                | Deferred pending                                        |
| ---------------------------- | --------------------------------------------------------- | ------------------------------------------------------- |
| GraphRAG canonical module    | `server/src/graphrag` should be implementation target     | confirmation of existing module ownership and contracts |
| Marquez local profile wiring | existing compose stack can host Marquez profile safely    | compose service impact review                           |
| OpenLineage transport        | HTTP emitter target and auth strategy can be standardized | security + policy review                                |
| Must-not-touch critical list | protected paths can be frozen for PR2+ implementation     | explicit release-captain countersign                    |

## Must-Not-Touch (Verified from CODEOWNERS)

The following surfaces are treated as protected unless a Governed Exception record is approved:

- `services/auth/`, `server/src/middleware/auth.ts`, `server/src/lib/permissions/`
- `policy/`, `opa/`
- `security/`, `server/src/security/`, `server/src/provenance/`
- `deploy/`, `server/src/db/`, `migrations/`, `schema/`

## Validation Checklist (PR1 complete)

- [x] Confirmed baseline `pnpm` scripts and test commands.
- [x] Confirmed workflow gate file presence for PR, verify, and security.
- [x] Confirmed canonical backend module roots under `server/src/*`.
- [x] Confirmed existing lineage implementation already present to avoid duplicate semantics.
- [x] Captured protected path list from `CODEOWNERS` for clean merge discipline.

## Forward Validation Checklist (PR2+)

- [ ] Validate Neo4j conventions for TwinGraph data model and migration boundaries.
- [ ] Validate OpenLineage payload schema + redaction contract with security team.
- [ ] Validate Marquez profile startup in local compose and deterministic e2e assertion.
- [ ] Validate branch protection required checks against `pr-quality-gate.yml` outputs.
