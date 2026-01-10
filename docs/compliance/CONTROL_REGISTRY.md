# Control Registry

## Supply Chain Integrity (SCI)

| ID          | Control Name                      | Intent | Mapped Checks                                                                        | Owner  | Evidence                                                                               |
| ----------- | --------------------------------- | ------ | ------------------------------------------------------------------------------------ | ------ | -------------------------------------------------------------------------------------- |
| **SCI-001** | **Deterministic Build Output**    | P0     | `pnpm build`, `scripts/release/generate_evidence_bundle.mjs`                         | System | `evidence/ga/verify-trace.json`                                                        |
| **SCI-002** | **Evidence Drift Detection**      | P0     | `verify-release-bundle.mjs --regenerate-and-compare`                                 | System | `evidence/ga/verify-trace.json`                                                        |
| **SCI-003** | **Cryptographic Non-Repudiation** | P0     | `cosign`                                                                             | System | GitHub Actions Log                                                                     |
| **SCI-004** | **Bundle Policy Enforcement**     | P0     | `verify-release-bundle.mjs --strict`, `policy/evidence-bundle.policy.json`           | System | `evidence/ga/verify-trace.json`                                                        |

## Access Control (AC)

| ID         | Control Name           | Intent | Mapped Checks                   | Owner  | Evidence                |
| ---------- | ---------------------- | ------ | ------------------------------- | ------ | ----------------------- |
| **AC-001** | **Least Privilege CI** | P0     | GitHub Actions OIDC Integration | DevOps | GitHub Actions Workflow |

## Static Analysis (SA)

| ID         | Control Name           | Intent | Mapped Checks              | Owner  | Evidence                        |
| ---------- | ---------------------- | ------ | -------------------------- | ------ | ------------------------------- |
| **SA-001** | **Type Safety**        | P0     | `pnpm typecheck`           | Dev    | `evidence/ga/verify-trace.json` |
| **SA-002** | **Linting Standards**  | P0     | `pnpm lint`                | Dev    | `evidence/ga/verify-trace.json` |

## Testing (TEST)

| ID           | Control Name             | Intent | Mapped Checks    | Owner  | Evidence                        |
| ------------ | ------------------------ | ------ | ---------------- | ------ | ------------------------------- |
| **TEST-001** | **Unit Test Coverage**   | P0     | `pnpm test:unit` | QA     | `evidence/ga/verify-trace.json` |
| **TEST-002** | **Smoke Verification**   | P0     | `pnpm ga:smoke`  | QA     | `evidence/ga/verify-trace.json` |
