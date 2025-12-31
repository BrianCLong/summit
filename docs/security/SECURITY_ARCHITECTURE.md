# System Security Architecture

**Version**: 1.0
**Status**: Live
**Date**: 2025-10-28
**Custodian**: Security Engineering

## 1. Introduction

This document provides a high-level overview of the Summit platform's security architecture. It is intended for external security reviewers, auditors, and enterprise customers who need to understand the system's trust boundaries, data flows, and control enforcement points.

## 2. Core Principles

Our security architecture is built on the following core principles:

*   **Defense in Depth**: We employ multiple layers of security controls to protect our assets.
*   **Zero Trust**: We assume no implicit trust between services and verify every request.
*   **Least Privilege**: Users and systems are granted only the permissions necessary to perform their functions.
*   **Secure by Design**: Security is a primary consideration in the design and development of all system components.

## 3. Trust Boundaries

The system is divided into several distinct trust boundaries:

*   **External -> Frontend**: Untrusted. All user input is considered malicious until validated.
*   **Frontend -> API Gateway**: Untrusted. The API gateway is the primary policy enforcement point for all incoming requests.
*   **API Gateway -> Internal Services**: Trusted, but authenticated and authorized. All inter-service communication requires mTLS and a valid service token.
*   **Internal Services -> Database/Cache**: Trusted network, but requires credentials. Access is restricted by network policies and database roles.
*   **Internal Services -> LLM/External APIs**: Untrusted egress. All outbound traffic is routed through a proxy for inspection and logging.

## 4. Identity, Authentication, and Authorization (AuthN/AuthZ)

1.  **Authentication (AuthN)**: Users authenticate via a trusted Identity Provider (IdP) using SAML or OIDC. The IdP issues a signed JSON Web Token (JWT).
2.  **API Gateway Validation**: The API Gateway validates the JWT signature and expiration on every incoming request.
3.  **Authorization (AuthZ)**: The gateway, in conjunction with an OPA sidecar, evaluates policies based on the user's role and tenant ID (from the JWT) and the target resource.
4.  **Context Propagation**: The validated user/tenant context is securely propagated to downstream services via internal headers.

## 5. Agent Execution Boundaries

Autonomous agents are a powerful but high-risk component of the system. Their execution is strictly controlled:

*   **Scoped Permissions**: Each agent operates with a short-lived, single-purpose service account with narrowly scoped permissions.
*   **Resource Caps**: Agents are subject to strict resource quotas (CPU, memory, token usage) enforced by a central Budget and Quota service.
*   **Sandboxing (Future)**: For agents that need to execute untrusted code or access external resources, we are implementing a sandboxed execution environment.

## 6. Policy Enforcement Points

Security policies are enforced at multiple layers:

*   **API Gateway**: The primary enforcement point for AuthN/AuthZ and rate limiting.
*   **OPA (Open Policy Agent)**: Used for fine-grained authorization decisions at the gateway and within critical services. Policies are managed as code in `/policy`.
*   **Database**: Row-Level Security (RLS) is used in PostgreSQL to enforce tenant data isolation at the database layer.
*   **Safety Invariants**: Critical application-level safety guarantees (e.g., "a user can never see another tenant's data") are enforced in code and validated by dedicated tests. See `SAFETY_INVARIANTS.md`.

## 7. Data Handling and Isolation

*   **Data Classification**: All data is classified (e.g., Public, Internal, Confidential, Restricted) as defined in `docs/security/ASSET_CLASSIFICATION.md`.
*   **Encryption in Transit**: All network communication, both external and internal, is encrypted with TLS 1.2+.
*   **Encryption at Rest**: All data stored in databases and object storage is encrypted at rest using AES-256.
*   **Tenant Isolation**: Data is strictly segregated by a `tenant_id` at the API, application, and database layers. This is our most critical security guarantee.

## 8. Supply-Chain Trust

*   **Dependency Scanning**: We use `pnpm audit` and other tools to scan for known vulnerabilities in our dependencies as part of the CI pipeline (`/.github/workflows/ci-security.yml`).
*   **Software Bill of Materials (SBOM)**: An SBOM is generated for every build (`/scripts/generate-sbom.sh`) to provide a complete inventory of our software components.
*   **Reproducible Builds**: Our build process is designed to be deterministic, ensuring that the same source code always produces the exact same binary artifact.

## 9. Canary/Rollback and Drift Controls

*   **Canary Deployments**: New releases are first deployed to a small subset of users (canary) to monitor for errors and performance degradation before a full rollout.
*   **Automated Rollback**: We have automated monitoring that can trigger an immediate rollback to the previous stable version if key SLOs (Service Level Objectives) are violated.
*   **Configuration Drift Detection**: We use infrastructure-as-code (Terraform/Helm) and CI checks to detect and prevent manual changes to our production environment that could weaken our security posture.
