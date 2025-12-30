# STRIDE Threat Model

**Date:** 2025-10-27
**Target:** IntelGraph Platform v1.0

| Threat | Description | Mitigation | Verified |
| :--- | :--- | :--- | :--- |
| **Spoofing** | Attacker impersonates a user or service. | **OIDC/JWT** for users. **SPIFFE/mTLS** for services. | ✅ |
| **Tampering** | Modification of graph data or audit logs. | **Immutable Audit Ledger** (WORM). Hash chains. Signed artifacts. | ✅ |
| **Repudiation** | User denies performing an action. | Comprehensive **Audit Logging** with non-repudiation (digital signatures). | ✅ |
| **Information Disclosure** | Leakage of PII or sensitive graph data. | **ABAC (OPA)** policies. **Field-level encryption**. **TLS 1.3** everywhere. | ✅ |
| **Denial of Service** | System overload via API or ingestion. | **Rate Limiting** (API & IP). **Queue-based ingestion** (backpressure). | ✅ |
| **Elevation of Privilege** | User gains admin access. | **RBAC/ABAC** strict enforcement. **MFA** for admin actions. | ✅ |

## Critical Paths
1.  **Ingestion:** External Data -> Ingest Service -> Kafka -> Neo4j.
    *   *Risk:* Malicious payload injection.
    *   *Defense:* Input validation (Zod schemas) at ingress.
2.  **Analyst Query:** UI -> API Gateway -> Graph Service.
    *   *Risk:* Unauthorized data access.
    *   *Defense:* OPA check on every query resolver.

## Status
*   Pen-test scheduled for: 2025-11-01
*   Automated scans (Trivy/Snyk): Running weekly in CI.
