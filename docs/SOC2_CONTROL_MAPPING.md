# SOC 2 Control Mapping

This document maps the technical controls implemented in the Summit (IntelGraph) platform to the SOC 2 Trust Service Criteria.

| Control Category       | Technical Control                                                                                                                                                 | SOC 2 Trust Service Criteria |
| :--------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------- | :--------------------------- |
| **Change Management**  | All code changes are managed through Git and require a pull request.                                                                                              | CC3.2                        |
|                        | PRs gated by CI/CD gates (e.g., `pr-quality-gate.yml`) enforcing SAST/SCA and quality metrics.                                                                    | CC3.2, CC4.1                 |
| **Access Control**     | Enforced via [EnhancedGovernanceRBACService.ts](file:///Users/brianlong/Developer/summit/server/src/services/EnhancedGovernanceRBACService.ts).                    | CC6.1                        |
|                        | RBAC/ABAC validation integrated with purpose-based authorization and legal basis checks.                                                                          | CC6.1                        |
| **Security Monitoring** | Cryptographically chained audit logs implemented in [ImmutableAuditLogService.ts](file:///Users/brianlong/Developer/summit/server/src/services/ImmutableAuditLogService.ts) and [ledger.ts](file:///Users/brianlong/Developer/summit/server/src/provenance/ledger.ts). | CC7.2                        |
|                        | Real-time threat detection and anomaly scoring in [AdvancedSecurityObservabilityService.ts](file:///Users/brianlong/Developer/summit/server/src/services/AdvancedSecurityObservabilityService.ts). | CC7.2, CC7.3                 |
|                        | FIPS 140-2 Level 3 cryptographic service verified in [fips-compliance.ts](file:///Users/brianlong/Developer/summit/server/src/federal/fips-compliance.ts).        | CC7.1                        |
| **Availability**       | High-availability design for microservices, managed via Kubernetes manifests in `k8s/`.                                                                           | A1.1                         |
|                        | Real-time health checks and HSM readiness monitoring in [fips-compliance.ts](file:///Users/brianlong/Developer/summit/server/src/federal/fips-compliance.ts).      | A1.2                         |
|                        | Resource protection and cost-based rate limiting enforced by [cost-guard.ts](file:///Users/brianlong/Developer/summit/server/src/services/cost-guard.ts).          | A1.2                         |
| **Confidentiality**    | WORM (Write-Once, Read-Many) audit chain and S3 Object Lock implemented in [worm-audit-chain.ts](file:///Users/brianlong/Developer/summit/server/src/federal/worm-audit-chain.ts). | C1.1                         |
|                        | Data protection verified through Merkle tree integrity and HSM-signed roots.                                                                                      | C1.1, C1.2                   |
