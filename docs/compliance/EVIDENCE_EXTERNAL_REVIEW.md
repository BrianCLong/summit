# External Review Evidence Pack

**Version**: 1.0
**Status**: Live
**Date**: 2025-10-28
**Custodian**: Governance, Risk, and Compliance (GRC)

## 1. Purpose of This Document

Welcome to the Summit External Review Evidence Pack. This document is designed to provide security reviewers, enterprise customers, and auditors with a centralized, easy-to-navigate guide to our security and compliance posture.

Our goal is to be transparent and to make the review process as efficient as possible. We believe in "trust but verify," and this document provides the necessary links and instructions to independently verify our claims.

## 2. Key Compliance Artifacts

This repository contains a suite of documents that describe our security program. We recommend reviewing them in the following order:

1.  **Security Architecture (`docs/security/SECURITY_ARCHITECTURE.md`)**: Start here to understand the fundamental design of our system, including our trust boundaries, data flows, and core security principles.
2.  **Control Frameworks (`docs/compliance/CONTROL_FRAMEWORKS.md`)**: This document maps our internal controls to common industry frameworks like SOC 2 and ISO 27001, linking each control to the specific evidence of its implementation.
3.  **Threat Model (`docs/security/THREAT_MODEL.md`)**: This document outlines our assessment of the key threats to our platform and the primary mitigations we have in place to address them.
4.  **Risk Register (`docs/security/RISK_REGISTER.md`)**: This provides an overview of our risk management framework and the principal risk areas we monitor.
5.  **GA Attestation (`docs/ga/ATTESTATION.md`)**: This is our formal declaration of the security, provenance, and reproducibility guarantees we provide. It also serves as a step-by-step guide for verifying our key claims.

## 3. How to Rerun Verifications

We encourage reviewers to rerun our verification processes to build confidence in our systems. Our [`GA Attestation`](../ga/ATTESTATION.md) document contains a detailed "Reviewer's Guide" with specific commands to verify claims related to:

*   Security control implementation
*   Software supply chain security (SBOMs, dependency pinning)
*   CI/CD enforcement of quality and security gates
*   Testing of critical safety invariants

## 4. Known Limitations & Future Roadmap

We are committed to continuous improvement. While we are confident in the security posture of our GA release, we have identified the following areas for future enhancement:

*   **Agent Sandboxing**: We are actively developing a sandboxed execution environment for autonomous agents to provide an even stronger layer of isolation.
*   **Formalized Safety Invariants**: We are working to formalize our key application-level safety guarantees in a dedicated `SAFETY_INVARIANTS.md` document, with each invariant being programmatically tied to a "proof" test.
*   **Expanded Automated Testing**: We will continue to expand our automated security testing to cover a broader range of potential vulnerabilities.

We believe this transparent approach provides a clear and honest view of our current capabilities and our commitment to future security investment.

## 5. Contact Information

For any questions or clarification, please do not hesitate to contact our Governance, Risk, and Compliance (GRC) team at `grc@summit.com`.
