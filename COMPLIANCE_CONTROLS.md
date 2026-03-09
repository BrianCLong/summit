# Compliance Controls Inventory

This document serves as the single source of truth for all enforced controls within the Summit ecosystem. Each control listed here is mechanically enforced by code, policy, or CI/CD pipelines.

## 1. Governance Controls

| Control ID | Description                  | Enforcement Mechanism                                                                                                                                                         | Evidence | Owner                                                                    |
| :--------- | :--------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :------- | :----------------------------------------------------------------------- | -------------------- |
| GOV-001    | **System Purpose & Limits**  | The system's purpose is explicitly defined and its limits, particularly regarding prohibited actions (e.g., autonomous lethal decisions, mass persuasion), are non-revocable. | Policy   | [docs/governance/CONSTITUTION.md](docs/governance/CONSTITUTION.md)       | Governance           |
| GOV-002    | **Human Primacy**            | All consequential actions require human authorization and must be traceable to a human's intent.                                                                              | Policy   | [docs/governance/CONSTITUTION.md](docs/governance/CONSTITUTION.md)       | Governance           |
| GOV-003    | **Governance Supremacy**     | Governance, policy, and audit controls override all other system considerations, including performance and automation.                                                        | Policy   | [docs/governance/CONSTITUTION.md](docs/governance/CONSTITUTION.md)       | Governance           |
| GOV-004    | **Conflict Resolution**      | A formal protocol exists for resolving conflicts between rules or agent behaviors, with a defined escalation path.                                                            | Policy   | [docs/governance/META_GOVERNANCE.md](docs/governance/META_GOVERNANCE.md) | Governance Lead      |
| GOV-005    | **Standardization Protocol** | A formal process is required for proposing, reviewing, and ratifying technical standards, which are then codified in the Rulebook.                                            | Policy   | [docs/governance/META_GOVERNANCE.md](docs/governance/META_GOVERNANCE.md) | Architecture Council |

## 2. Autonomy & Agent Controls

| Control ID | Description               | Enforcement Mechanism                                                                                                           | Evidence | Owner                                                              |
| :--------- | :------------------------ | :------------------------------------------------------------------------------------------------------------------------------ | :------- | :----------------------------------------------------------------- | ---------- |
| AI-001     | **Limited Agent Classes** | Agents are restricted to Assistive, Evaluative, or strictly bounded Operational classes.                                        | Policy   | [docs/governance/CONSTITUTION.md](docs/governance/CONSTITUTION.md) | Governance |
| AI-002     | **Autonomy Prohibition**  | Autonomous actions are prohibited in production and may only occur in sandboxed evaluation environments with explicit approval. | Policy   | [docs/governance/CONSTITUTION.md](docs/governance/CONSTITUTION.md) | Governance |

## 3. Provenance & Audit Controls

| Control ID | Description                         | Enforcement Mechanism                                                                                                                 | Evidence         | Owner                                                                      |
| :--------- | :---------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------ | :--------------- | :------------------------------------------------------------------------- | --------------------- |
| AUD-001    | **Provenance Requirement**          | All system outputs must be attributable, explainable, replayable, and contestable. Unattributed intelligence is considered invalid.   | Policy           | [docs/governance/CONSTITUTION.md](docs/governance/CONSTITUTION.md)         | Governance            |
| AUD-002    | **Immutable Audit Trail**           | All significant events, including data access, decisions, and policy changes, are logged to an immutable provenance ledger.           | Code             | [prov-ledger/docs/README.md](prov-ledger/docs/README.md)                   | Security Directorate  |
| AUD-003    | **Media Authenticity & Provenance** | Marketing/public media assets must ship with deterministic provenance evidence bundles; detector-only claims are governed exceptions. | Policy + CI Gate | [docs/governance/media_provenance.md](docs/governance/media_provenance.md) | Governance + Security |

## 4. CI/CD & Release Controls

| Control ID | Description                 | Enforcement Mechanism                                                                                                                       | Evidence        | Owner                                                                          |
| :--------- | :-------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------ | :-------------- | :----------------------------------------------------------------------------- | -------------------- |
| CICD-001   | **Automated Quality Gates** | All pull requests are subject to a mandatory CI pipeline that runs automated checks for code quality, testing, and security before merging. | CI Pipeline     | [.github/workflows/pr-quality-gate.yml](.github/workflows/pr-quality-gate.yml) | Architecture Council |
| CICD-002   | **Conventional Commits**    | Commit messages must follow the Conventional Commits specification. This is enforced by pre-commit hooks and CI checks.                     | Pre-commit Hook | [.husky/commit-msg](.husky/commit-msg)                                         | Architecture Council |
| CICD-003   | **Golden Path Smoke Test**  | All changes must pass a "golden path" smoke test, ensuring core functionality is never broken.                                              | CI Pipeline     | [.github/workflows/pr-quality-gate.yml](.github/workflows/pr-quality-gate.yml) | Architecture Council |

## 5. Security & Data Handling Controls

| Control ID | Description                           | Enforcement Mechanism                                                                                                            | Evidence        | Owner                                                                          |
| :--------- | :------------------------------------ | :------------------------------------------------------------------------------------------------------------------------------- | :-------------- | :----------------------------------------------------------------------------- | -------------------- |
| SEC-001    | **Secret Scanning**                   | The codebase is automatically scanned for secrets before commits are accepted.                                                   | Pre-commit Hook | [.husky/pre-commit](.husky/pre-commit)                                         | Security Directorate |
| SEC-002    | **Production Guardrails**             | The API server is prevented from starting in a production environment if default secrets or insecure configurations are used.    | Code            | [server/src/config.ts](server/src/config.ts)                                   | Security Directorate |
| SEC-003    | **Dependency Vulnerability Scanning** | The project's dependencies are automatically scanned for vulnerabilities, and the build fails if high-severity issues are found. | CI Pipeline     | [.github/workflows/pr-quality-gate.yml](.github/workflows/pr-quality-gate.yml) | Security Directorate |

## 6. Continuous Monitoring & Futureproofing Controls

| Control ID | Description                        | Enforcement Mechanism                                                                                                                                                                                                  | Evidence              | Owner                                                                                            |
| :--------- | :--------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :-------------------- | :----------------------------------------------------------------------------------------------- | ----------------- |
| CFM-001    | **Continuous Control Monitoring**  | Control effectiveness is instrumented with telemetry (metrics, logs, traces) and evaluated via automated dashboards and alerts. Regressions raise incidents with runbook-driven response.                              | Observability Tooling | [docs/observability/phase-1-delivery-runbook.md](docs/observability/phase-1-delivery-runbook.md) | SRE + Compliance  |
| CFM-002    | **Automated Regression Detection** | Security, compliance, and privacy regression tests (unit, integration, perf/saturation, and fuzz) are executed on each merge and nightly; failures block releases and open tickets automatically.                      | CI Pipeline           | [.github/workflows/pr-quality-gate.yml](.github/workflows/pr-quality-gate.yml)                   | QA + Security     |
| CFM-003    | **Evergreen Compliance Cadence**   | A standing compliance review squad operates on a fixed cadence (weekly triage + monthly deep-dive) to update controls against new standards and threats; outputs are codified as policy-as-code and added to CI gates. | Policy + RACI         | [docs/governance/quality-assurance.md](docs/governance/quality-assurance.md)                     | Compliance Office |
