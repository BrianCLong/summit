# Governance Operating Model for Scale

This document defines the roles, responsibilities, and processes for the new governance model, ensuring that it can scale effectively across multiple repositories.

## 1. Overview

The goal of the governance operating model is to provide a clear and consistent framework for managing policies, evidence, and compliance across the entire Summit ecosystem.

## 2. Roles and Responsibilities

| Role              | Responsibilities                                                                                             |
| ----------------- | ------------------------------------------------------------------------------------------------------------ |
| `Policy Owner`      | Owns and maintains the canonical policies in the central repository.                                        |
| `Release Captain`   | Owns the release process for a specific repository and is responsible for ensuring that all releases are compliant with the canonical policies. |
| `Security Owner`    | Owns the security policies and is responsible for ensuring that all releases are secure.                    |
| `Compliance Owner`  | Owns the compliance policies and is responsible for ensuring that all releases are compliant with the relevant regulations. |
| `CS Owner`          | Owns the customer success policies and is responsible for ensuring that all releases are aligned with the needs of the customer. |

## 3. Cadence

| Cadence  | Activity                                                                                                    |
| -------- | ----------------------------------------------------------------------------------------------------------- |
| `Nightly`| A nightly job will be run to detect policy drift and generate a report.                                    |
| `Weekly` | A weekly review will be held to discuss the policy drift report and any other governance-related issues.      |
| `Release`| A release checklist will be used to ensure that all releases are compliant with the canonical policies.       |

## 4. Escalation Paths

| Issue                           | Escalation Path                                                                                             |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `Policy Drift`                  | If a repository is found to have policy drift, the Release Captain will be notified and will be responsible for resolving the drift. |
| `Security Vulnerability`        | If a security vulnerability is found, the Security Owner will be notified and will be responsible for resolving the vulnerability. |
| `Compliance Violation`          | If a compliance violation is found, the Compliance Owner will be notified and will be responsible for resolving the violation. |
| `Customer Impact`               | If a release is found to have a negative impact on a customer, the CS Owner will be notified and will be responsible for resolving the impact. |

## 5. "Stop-the-Line" Rules

The following rules will be used to "stop the line" and prevent a release from being deployed:

-   Any release with a high or critical security vulnerability will be blocked.
-   Any release with a compliance violation will be blocked.
-   Any release with a negative impact on a customer will be blocked.
