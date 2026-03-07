# Attestation Scope for the Summit Platform

## 1. Introduction & Guiding Principles

This document defines the scope of attestable trust signals for the Summit platform. Its purpose is to provide a clear, conservative, and verifiable account of the controls and guarantees that underpin the platform's security, compliance, and reliability.

All attestations listed here adhere to the following principles:

- **Evidence-Based:** Every claim is backed by automated, verifiable evidence. No manual or aspirational claims are made.
- **Fail-Closed:** Trust signals degrade gracefully. If an underlying control weakens or fails, the corresponding attestation is invalidated.
- **Explicitly Bounded:** The scope of each attestation is precisely defined. What is _not_ covered is as important as what _is_ covered.

## 2. In-Scope Trust Signals

The following signals are currently in-scope for third-party attestation. The "Evidence Source" column points to the verifiable artifact or automated check that proves the control is active and effective.

---

### Category: Code Quality & Correctness

**Owner:** Platform Governance Team

| Trust Signal             | Description                                                                                         | Evidence Source                                |
| ------------------------ | --------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| **Static Code Analysis** | The codebase is automatically scanned for code quality issues, bugs, and anti-patterns.             | `pr-quality-gate.yml`: Lint & Format Check job |
| **Type Safety**          | The TypeScript codebase is checked for type errors, reducing the risk of runtime type-related bugs. | `pr-quality-gate.yml`: Typecheck job           |
| **Unit Test Coverage**   | All new code is accompanied by unit tests that validate its correctness in isolation.               | `pr-quality-gate.yml`: Unit Tests job          |

---

### Category: Security & Vulnerability Management

**Owner:** Security Assurance Team

| Trust Signal                                   | Description                                                                                                                                  | Evidence Source                                          |
| ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| **Dependency Vulnerability Scanning**          | All third-party dependencies are automatically scanned for known vulnerabilities. Builds fail if high-severity vulnerabilities are detected. | `pr-quality-gate.yml`: Security Audit (Fail on High) job |
| **Static Application Security Testing (SAST)** | The codebase is scanned for common security vulnerabilities (e.g., OWASP Top 10) using SonarQube.                                            | `pr-quality-gate.yml`: SonarQube SAST Scan job           |
| **Security Best Practices Linting**            | The codebase is linted for security-specific anti-patterns and insecure coding practices.                                                    | `pr-quality-gate.yml`: Security Lint job                 |
| **Threat Model Adherence**                     | The system's design and controls are aligned with a documented threat model that is regularly reviewed.                                      | `THREAT_MODEL.md`                                        |

---

### Category: System Integrity & Reliability

**Owner:** Platform Engineering Team

| Trust Signal                           | Description                                                                                                                                                    | Evidence Source                                      |
| -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| **Golden Path Verification**           | The critical user and data pathways of the system are continuously validated via automated smoke tests. A failure in the golden path blocks any change.        | `pr-quality-gate.yml`: Smoke Tests (Golden Path) job |
| **Constitutional Governance**          | All development and operational activities are bound by a supreme governing document that prioritizes safety and auditability over performance or convenience. | `docs/governance/CONSTITUTION.md`                    |
| **Automated Quality Gate Enforcement** | All code changes must pass a comprehensive, automated quality gate before being merged. This gate enforces all in-scope attestations.                          | `pr-quality-gate.yml`                                |

---

## 3. Out-of-Scope Signals

The following areas are explicitly **out-of-scope** for third-party attestation at this time. While controls and processes may exist in these areas, they are not yet backed by the level of automated, verifiable evidence required for a formal attestation.

| Signal / Area                                     | Reason for Exclusion                                                                                                                                                                        |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Operational Uptime / SLAs**                     | Uptime and Service Level Agreements (SLAs) are monitored, but the alerting and reporting mechanisms are not yet integrated into a verifiable, auditable evidence bundle.                    |
| **Incident Response Times**                       | Incident response procedures are documented in internal runbooks, but the response time metrics are not yet captured in a way that can be automatically and independently verified.         |
| **Dynamic Application Security Testing (DAST)**   | DAST scanning is performed intermittently but is not yet a required, blocking check in the CI/CD pipeline for every change.                                                                 |
| **Data Residency & Isolation**                    | While data is architected for tenant isolation, there is not yet an automated test suite that continuously verifies these boundaries cannot be breached.                                    |
| **Regulatory Compliance (e.g., SOC2, ISO 27001)** | The controls listed in this document are foundational to formal compliance frameworks, but the platform has not yet undergone a formal, third-party audit against these specific standards. |

## 4. Attestation Lifecycle

Attestations are bound to software releases. Evidence bundles will be generated for each major and minor release, containing the logs and artifacts from the CI/CD pipelines that validate the signals listed above. If a control fails or is bypassed for a given release, the corresponding attestations are considered invalid for that release.
