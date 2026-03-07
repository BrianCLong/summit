# Public Compliance Posture

_Last Updated: 2025-10-25_

This document defines the approved language for communicating Summit's compliance posture to the public and customers.

> **Warning:** Do not deviate from these approved statements without Legal/Compliance review.

## General Statement

"Summit is designed with a 'Compliance-as-Code' architecture. Our governance, risk, and compliance controls are integrated directly into our development lifecycle, ensuring security and reliability by default."

## Specific Claims & Evidence

### 1. Data Security & Encryption

**Claim:** "All customer data is encrypted at rest and in transit."
**Evidence Basis:**

- TLS 1.3 enforcement at ingress.
- Database encryption enabled (AES-256).
- **Internal Ref:** `CC6.1` in `compliance/control-map.yaml`.

### 2. Access Control

**Claim:** "We utilize a zero-trust, attribute-based access control (ABAC) model."
**Evidence Basis:**

- OPA policy enforcement for every API request.
- Strict separation of duties for production access.
- **Internal Ref:** `CC6.1` in `compliance/control-map.yaml`.

### 3. Change Management

**Claim:** "Every change to the Summit platform undergoes automated testing and peer review before deployment."
**Evidence Basis:**

- Enforced Pull Request workflows.
- CI/CD pipelines with security gates.
- **Internal Ref:** `CC7.1` in `compliance/control-map.yaml`.

## Certification Status

| Framework        | Status            | Target Date |
| :--------------- | :---------------- | :---------- |
| **SOC 2 Type 1** | _Readiness Phase_ | Q4 2025     |
| **ISO 27001**    | _Roadmap_         | 2026        |

## Transparency

Summit makes its detailed control mapping available to qualified customers under NDA. Please request our **Trust Packet** for more details.
