# Prioritized Work Queue

## Immediate Actions (Next 24h)
### Critical Path Blockers (Must Start Now)
- **A1**: Implement OIDC SSO (Okta/Entra/Auth0) in API & Web [Identity & SCIM] (P1 -> P0 Critical)
  - **Why**: Blocks A3, A5, B1, C1, D1, D2, G1.
  - **Next Steps**: Scaffold OIDC integration; implement refresh rotation; emit group claims.

### P0 Issues (Unblocked or Parallelizable)
- **E1**: Generate SBOMs for All Services (Syft) [Supply‑chain / SBOM]
  - **Why**: Compliance/Security foundation. Blocks E2.
  - **Next Steps**: Integrate syft in CI/CD pipeline; verify artifact upload.
- **E5**: Secrets Management Baseline & Rotation Hooks [Supply‑chain / SBOM]
  - **Why**: Security baseline.
  - **Next Steps**: Audit secrets; implement KMS envelope; define rotation endpoints.

## In Progress Monitoring (Next 48h)
_No issues explicitly marked "In Progress" in source data. Assuming all P0/P1 are pending post-recovery validation._
- **Monitor**: CI/CD stability for **E1** and **E5** implementations.

## High Priority Queue (Next Week)
### Dependency-Ordered Execution
1. **A3**: SCIM v2 User/Group Sync [Identity & SCIM] (P0)
   - **Depends on**: A1
2. **A5**: Session Security Hardening [Identity & SCIM] (P0)
   - **Depends on**: A1
3. **B1**: Introduce OPA Policy Layer for GraphQL Resolvers [OPA/ABAC] (P0)
   - **Depends on**: A1, A3
4. **B2**: ABAC Model & Attribute Schema [OPA/ABAC] (P0)
   - **Depends on**: B1
5. **C1**: Unified Audit Log Middleware [Audit & Provenance] (P0)
   - **Depends on**: B1
6. **D1**: Add `tenant_id` Namespace to Data Stores [Tenant Isolation (v1)] (P0)
   - **Depends on**: B1
7. **D2**: Persisted GraphQL Queries per Tenant (Whitelist) [Tenant Isolation (v1)] (P0)
   - **Depends on**: D1, B1
8. **G1**: Golden‑Path Synthetic (Investigation→Insight < 3m) [Observability & SLOs] (P0)
   - **Depends on**: D2
9. **E2**: Container Image Signing (cosign) + Verify Gate [Supply‑chain / SBOM] (P0)
   - **Depends on**: E1
10. **B4**: Policy Bundle Pipeline in CI [OPA/ABAC] (P0)
    - **Depends on**: Supply‑chain (E series)
11. **C2**: AI Copilot Provenance Store [Audit & Provenance] (P0)
    - **Depends on**: C1, D2
12. **F1**: Data Classification & Labels (UI + Backend) [Data Governance (v1)] (P0)
    - **Depends on**: B2
13. **F2**: Field‑Level Redaction Library [Data Governance (v1)] (P0)
    - **Depends on**: C2

### P1 Backlog (Start after critical P0s are unblocked)
- **A2**: SAML 2.0 SSO (service provider) (Deps: A1)
- **A4**: Group/Attribute Mapping UI (IdP Wizard) (Deps: A1, A3)
- **B3**: UI Route Guards + Policy Evaluation (Deps: B1)
- **C3**: Audit Export & Tamper‑Evident Hashing (Deps: C1)
- **D3**: Per‑Tenant Rate Limits & Quotas (Deps: D1)
- **E3**: SLSA Provenance Attestations (Deps: E2)
- **E4**: Dependency Allowlist + Renovate
- **F3**: Retention & Legal Hold Policies (Deps: C1)
- **F4**: DSAR Search Endpoint (Admin) (Deps: C1, F1)
- **G2**: API p95 Latency SLO (<300ms) Dashboard & Alerting
- **G3**: Ingest E2E SLO (<5m p95) & Backpressure Controls (Deps: Ops)
- **X1**: Admin Onboarding Wizard (IdP + Tenant Basics) (Deps: A1, A3, D1)
- **X3**: Procurement Kit v1 (MSA/DPA/SLA/AUP templates) (Deps: X2)

## Blockers & Dependencies
- **CRITICAL**: **A1** is the primary bottleneck for Identity, Policy, Audit, and Tenant Isolation workstreams. Immediate focus required.
- **Supply Chain**: **E1** is the foundation for image signing (E2) and attestations (E3).
- **Tenant Isolation**: **D1** is dependent on Policy Layer (B1), which is blocked by Identity (A1).
- **Observability**: **G1** (Golden Path Synthetic) requires full stack (D2 -> D1 -> B1 -> A1).
