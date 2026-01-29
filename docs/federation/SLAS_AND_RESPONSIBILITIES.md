# SLAs and Responsibilities

This document defines the Service Level Agreements (SLAs) and responsibilities for the governance process.

## 1. Overview

The goal of the SLAs and responsibilities is to ensure that the governance process is efficient, effective, and transparent.

## 2. SLAs

| SLA                 | Description                                                                                             |
| ------------------- | ------------------------------------------------------------------------------------------------------- |
| `Policy Drift`      | Policy drift must be resolved within 24 hours of being detected.                                        |
| `Security Vulnerability` | High and critical security vulnerabilities must be resolved within 24 hours of being detected.      |
| `Compliance Violation` | Compliance violations must be resolved within 24 hours of being detected.                             |
| `Customer Impact`   | Negative customer impacts must be resolved within 24 hours of being detected.                           |

## 3. Responsibilities

| Role              | Responsibilities                                                                                             |
| ----------------- | ------------------------------------------------------------------------------------------------------------ |
| `Policy Owner`      | - Maintain the canonical policies in the central repository.                                                |
|                   | - Review and approve all changes to the canonical policies.                                                 |
| `Release Captain`   | - Ensure that all releases are compliant with the canonical policies.                                       |
|                   | - Resolve any policy drift in their repository.                                                             |
| `Security Owner`    | - Ensure that all releases are secure.                                                                      |
|                   | - Resolve any security vulnerabilities in their repository.                                                 |
| `Compliance Owner`  | - Ensure that all releases are compliant with the relevant regulations.                                     |
|                   | - Resolve any compliance violations in their repository.                                                    |
| `CS Owner`          | - Ensure that all releases are aligned with the needs of the customer.                                      |
|                   | - Resolve any negative customer impacts in their repository.                                                |
