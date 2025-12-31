# Control Framework Mapping

**Version**: 1.0
**Status**: Live
**Date**: 2025-10-28
**Custodian**: Governance, Risk, and Compliance (GRC)

## 1. Overview

This document maps Summit's internal security controls to common external security and compliance frameworks. Its purpose is to provide external reviewers, customers, and auditors with a clear, evidence-backed view of our security posture.

**Guiding Principles**:
*   **No Aspirational Controls**: Every control listed here is implemented and verifiable.
*   **Evidence-Backed**: Every control links directly to the code, configuration, CI job, or script that enforces it.
*   **Living Document**: This mapping is updated as our control environment evolves.

## 2. SOC 2 Style Controls (Trust Services Criteria)

These controls map to the common criteria found in a SOC 2 audit, covering the security, availability, and confidentiality of the platform.

| Control Area | Control ID | Control Description | Implementation Evidence |
| :--- | :--- | :--- | :--- |
| **Change Management** | `CM-1` | All code changes require a pull request with at least one peer review. | [GitHub Branch Protection Rules](https://github.com/BrianCLong/summit/settings/branches) (Requires Repo Admin) |
| | `CM-2` | Automated quality gates check for linting, testing, and security vulnerabilities before merge. | [`/.github/workflows/pr-quality-gate.yml`](../.github/workflows/pr-quality-gate.yml) |
| | `CM-3` | A formal release process is followed for GA deployments. | [`/.github/workflows/release-ga.yml`](../.github/workflows/release-ga.yml) |
| **Access Control** | `AC-1` | Production access is restricted to authorized personnel. | Defined in internal Identity Provider (Okta) and AWS IAM. |
| | `AC-2` | The principle of least privilege is applied to service accounts and user roles. | [Server RBAC Configuration](/server/src/auth/roles.ts) (Example) |
| | `AC-3` | Secrets are managed via a dedicated secrets management solution and not stored in code. | [Server Configuration](/server/src/config.ts) using `process.env` |
| **Logging & Monitoring** | `LM-1` | Application and system logs are centralized for analysis and monitoring. | Deployed via Helm charts to a central logging provider (e.g., Datadog). |
| | `LM-2` | Key security events (e.g., login failures, permission changes) are logged. | `Logger.warn('Failed login attempt...')` (Code-level implementation) |
| **Incident Response** | `IR-1` | A formal incident response plan exists. | [/docs/security/playbooks/incident-response.md](./security/playbooks/incident-response.md) |

## 3. ISO 27001 Style Controls (Annex A)

These controls align with the domains of ISO/IEC 27001, providing a broader information security management perspective.

| Control Area | Control ID | Control Description | Implementation Evidence |
| :--- | :--- | :--- | :--- |
| **Asset Management** | `A.8.1.1` | An inventory of information assets is maintained. | `docs/security/ASSET_CLASSIFICATION.md` |
| **Secure Development** | `A.14.2.1` | Secure coding standards are defined and followed. | `docs/security/SECURITY_GUIDELINES.md` |
| | `A.14.2.5` | A secure development lifecycle process is in place. | Documented in PR templates and enforced by CI. |
| | `A.14.2.8` | System security testing is performed. | `/.github/workflows/ci-security.yml` (SAST, Dependency Scan) |
| **Supplier Risk** | `A.15.1.2` | Security requirements for suppliers are defined. | `docs/security/SUPPLY_CHAIN.md` |
| | `A.15.1.3` | The software supply chain is managed to prevent tampering. | `pnpm-lock.yaml`, SBOM Generation (`/scripts/generate-sbom.sh`) |

## 4. AI / Agent-Governance Controls

These controls address the unique risks associated with AI and autonomous agent systems.

| Control Area | Control ID | Control Description | Implementation Evidence |
| :--- | :--- | :--- | :--- |
| **Prompt Control** | `AI-PC-1` | Defenses are implemented against prompt injection attacks. | System/user role separation in prompts; input sanitization logic. |
| **Agent Isolation** | `AI-AI-1` | Agents operate with the minimum necessary permissions. | Service account scoping and agent-specific roles. |
| | `AI-AI-2` | Agent execution is sandboxed where appropriate (e.g., for external code execution). | Not yet implemented; planned for future sprints. |
| **Auditability** | `AI-AU-1` | A non-repudiable audit trail of significant agent actions is maintained. | The Provenance Ledger service is designed for this purpose. |
| **Resource Limits** | `AI-RL-1` | Agents have strict resource caps (token usage, compute time) to prevent abuse. | Implemented via the Quota and Budget management system. |
| **Human Oversight** | `AI-HO-1` | A human is in the loop for critical agent decisions. | Manual approval steps in specific Maestro workflows. |
