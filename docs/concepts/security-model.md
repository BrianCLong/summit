---
title: Security Model
summary: Authentication, Authorization (RBAC/ABAC), and Policies.
version: v2.0.0
lastUpdated: 2025-12-29
---

# Security Model

Summit employs a Zero Trust architecture with layered defenses.

## Authentication (AuthN)

- **JWT**: Stateless access tokens with short lifetimes.
- **Refresh Tokens**: Rotated securely; used to obtain new access tokens.
- **Identity Provider**: Can integrate with OIDC providers (e.g., Keycloak, Auth0).

## Authorization (AuthZ)

We use a hybrid RBAC + ABAC model enforced by Open Policy Agent (OPA).

### Role-Based Access Control (RBAC)

High-level permissions assigned to users:

- `ADMIN`: Full access.
- `ANALYST`: Read/Write on investigations.
- `VIEWER`: Read-only.

### Attribute-Based Access Control (ABAC)

Fine-grained control based on data attributes (Policy Labels).

- **PolicyLabel**: Entities can be tagged (e.g., `TOP_SECRET`, `EYES_ONLY`).
- **Enforcement**: OPA policies check if the user has the required clearance for the entity's labels before returning data.

## Secrets Management

- **No Secrets in Code**: strictly enforced via `gitleaks`.
- **Environment Variables**: All sensitive config provided via `.env` (dev) or K8s Secrets (prod).
- **Rotation**: Credentials must be rotated if exposed.

## Vulnerability Management

- **Reporting**: `security@intelgraph.example.com` (Example).
- **Support**: Security fixes provided for `main` and latest tagged release.
- **Automated Scanning**: Nightly SBOM and CVE scans via Trivy/Grype.
