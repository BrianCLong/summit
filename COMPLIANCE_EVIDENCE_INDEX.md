# Compliance Evidence Index & Audit Guide

This document provides a centralized index of all compliance controls and serves as a guide for external auditors and reviewers.

## How to Audit Summit

Auditing Summit should be a straightforward process, as our controls are designed to be verifiable and transparent. Our core principle is **"show, don't tell."** Controls are enforced by the system itself, not just by policy documents.

To audit a control, please follow these steps:

1.  **Start with the Control Inventory:** The `COMPLIANCE_CONTROLS.md` file is the single source of truth for all our controls. Each control has a unique ID, a description, and a direct link to its enforcement mechanism and evidence.
2.  **Follow the Evidence Link:** The "Evidence" column in the inventory provides a direct link to the file or code that enforces the control. This might be a policy document, a CI/CD workflow, a pre-commit hook, or a specific piece of source code.
3.  **Verify the Enforcement:** Review the evidence to confirm that the control is being enforced as described. For example:
    - If the evidence is a CI/CD workflow, you can see the specific jobs and steps that are run on every pull request.
    - If the evidence is source code, you can see the logic that enforces the control at runtime.
    - If the evidence is a policy document, you can see the high-level principles that govern the system.
4.  **Consult the Framework Mappings:** The `COMPLIANCE_SOC_MAPPING.md`, `COMPLIANCE_ISO_MAPPING.md`, and `COMPLIANCE_AI_GOVERNANCE.md` files show how our controls map to standard compliance frameworks. These documents reference the control IDs from the inventory, allowing you to easily trace a framework requirement back to its concrete implementation.

## Master Control & Evidence Index

This table provides a consolidated view of all controls, their mappings to the various compliance frameworks, and direct links to the evidence.

| Control ID   | Description                       | Mapped Framework(s) | Evidence                                                                       |
| :----------- | :-------------------------------- | :------------------ | :----------------------------------------------------------------------------- |
| **GOV-001**  | System Purpose & Limits           | SOC, ISO, AI        | [docs/governance/CONSTITUTION.md](docs/governance/CONSTITUTION.md)             |
| **GOV-002**  | Human Primacy                     | SOC, ISO, AI        | [docs/governance/CONSTITUTION.md](docs/governance/CONSTITUTION.md)             |
| **GOV-003**  | Governance Supremacy              | ISO, AI             | [docs/governance/CONSTITUTION.md](docs/governance/CONSTITUTION.md)             |
| **GOV-004**  | Conflict Resolution               | SOC                 | [docs/governance/META_GOVERNANCE.md](docs/governance/META_GOVERNANCE.md)       |
| **GOV-005**  | Standardization Protocol          | SOC                 | [docs/governance/META_GOVERNANCE.md](docs/governance/META_GOVERNANCE.md)       |
| **AI-001**   | Limited Agent Classes             | AI                  | [docs/governance/CONSTITUTION.md](docs/governance/CONSTITUTION.md)             |
| **AI-002**   | Autonomy Prohibition              | AI                  | [docs/governance/CONSTITUTION.md](docs/governance/CONSTITUTION.md)             |
| **AUD-001**  | Provenance Requirement            | AI                  | [docs/governance/CONSTITUTION.md](docs/governance/CONSTITUTION.md)             |
| **AUD-002**  | Immutable Audit Trail             | SOC, ISO, AI        | [prov-ledger/docs/README.md](prov-ledger/docs/README.md)                       |
| **AUD-003**  | Media Authenticity & Provenance   | SOC, ISO, AI        | [docs/governance/media_provenance.md](docs/governance/media_provenance.md)     |
| **CICD-001** | Automated Quality Gates           | SOC, ISO            | [.github/workflows/pr-quality-gate.yml](.github/workflows/pr-quality-gate.yml) |
| **CICD-002** | Conventional Commits              | SOC                 | [.husky/commit-msg](.husky/commit-msg)                                         |
| **CICD-003** | Golden Path Smoke Test            | SOC, ISO            | [.github/workflows/pr-quality-gate.yml](.github/workflows/pr-quality-gate.yml) |
| **SEC-001**  | Secret Scanning                   | SOC, ISO            | [.husky/pre-commit](.husky/pre-commit)                                         |
| **SEC-002**  | Production Guardrails             | SOC, ISO            | [server/src/config.ts](server/src/config.ts)                                   |
| **SEC-003**  | Dependency Vulnerability Scanning | SOC, ISO            | [.github/workflows/pr-quality-gate.yml](.github/workflows/pr-quality-gate.yml) |
