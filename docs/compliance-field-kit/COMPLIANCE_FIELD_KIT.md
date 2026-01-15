# Compliance Field Kit (v1)

**Version:** 4.1.0-rc.1
**Date:** 2025-09-23
**Status:** READY FOR REVIEW

This bundle contains the artifacts required to pass security reviews and procurement gates.

## 1. Supply Chain Security (SBOM & Provenance)

We provide a comprehensive Software Bill of Materials (SBOM) in CycloneDX format, detailing all dependencies, licenses, and vulnerabilities.

*   **SBOM Location:** `/.evidence/sbom.json` (Generated in build)
*   **Verification:** Run `npm run generate:sbom` to regenerate locally.
*   **Signing:** All release artifacts are signed using Cosign. Public keys available upon request.

## 2. Security Gates Summary

Our CI/CD pipeline enforces the following gates before any code merges:

| Gate | Tool | Action on Failure |
| :--- | :--- | :--- |
| **SAST** | CodeQL / SonarQube | Block Merge |
| **Secrets Scan** | Gitleaks | Block Merge |
| **Dependency Scan** | Trivy | Block Merge (Critical/High) |
| **License Check** | FOSSA | Block Merge (Non-compliant) |
| **Policy Check** | OPA (Conftest) | Block Merge |

*See `/.github/workflows/verify-security-controls.yml` for the live definition.*

## 3. OPA Policy Bundle

We use Open Policy Agent (OPA) for fine-grained authorization.

*   **Policy Source:** `/policy` directory.
*   **Key Policies:**
    *   `rbac.rego`: Role-Based Access Control.
    *   `abac.rego`: Attribute-Based Access Control (Tenant/Classification).
    *   `cost.rego`: Budget enforcement.
*   **Update Mechanism:** Policies are versioned in Git and pushed to OPA bundles via the CI pipeline.

## 4. Data Handling & Privacy (DSAR)

**Data Subject Access Request (DSAR) Workflow:**

1.  **Request:** User submits request via Privacy Portal or API `/api/privacy/dsar`.
2.  **Verification:** Identity verified via MFA/Email.
3.  **Collection:** `PrivacyService` scans PostgreSQL (Relational) and Neo4j (Graph) for PII.
4.  **Review:** Compliance Officer reviews the generated data package.
5.  **Delivery:** Secure download link sent to user (expires in 24h).

*Runbook:* See `docs/runbooks/PRIVACY_DSAR.md` (Placeholder).

## 5. Tenant Governance Proof

The platform is multi-tenant by design (Shared Nothing or Logical Separation).

*   **Isolation:** Enforced by `tenant_id` on every table and Graph Label.
*   **Verification:** `server/src/lib/db/TenantSafePostgres.ts` ensures no query runs without a tenant context.
*   **Evidence:** See `docs/demo-pack/screenshots/` (to be populated) for Admin Console views of Tenant quotas and isolation.
