# SOC-Style Compliance Mapping

This document maps the controls inventoried in `COMPLIANCE_CONTROLS.md` to SOC 2 Trust Services Criteria.

## 1. Security (Common Criteria)

The Security category (also known as Common Criteria) covers the protection of information, software, and infrastructure against unauthorized access and changes.

| SOC 2 Criteria (Illustrative) | Control ID(s) | Evidence Summary |
| :--- | :--- | :--- |
| **CC6.1 Logical Access Control** | `AC-1`, `GOV-002` | Enforced via [EnhancedGovernanceRBACService.ts](file:///Users/brianlong/Developer/summit/server/src/services/EnhancedGovernanceRBACService.ts). Provides granular RBAC/ABAC with purpose-based validation. |
| **CC3.2 Change Management** | `CM-3`, `CICD-001` | Managed through formal CI/CD gates in `.github/workflows/`, enforced by branch protection and automated verification. |
| **CC7.1 Risk Mitigation** | `SEC-001`, `THREATMODEL.md` | Verified via FIPS-compliant cryptography in [fips-compliance.ts](file:///Users/brianlong/Developer/summit/server/src/federal/fips-compliance.ts) and HSM integration. |
| **CC7.2 Security Monitoring** | `AU-2`, `AUD-002` | Implemented via [ImmutableAuditLogService.ts](file:///Users/brianlong/Developer/summit/server/src/services/ImmutableAuditLogService.ts) and [AdvancedSecurityObservabilityService.ts](file:///Users/brianlong/Developer/summit/server/src/services/AdvancedSecurityObservabilityService.ts) providing cryptographically chained audit trails and real-time threat detection. |
| **CC7.3 Anomaly Detection** | `SEC-002` | Automated behavior pattern analysis and anomaly scoring implemented in [AdvancedSecurityObservabilityService.ts](file:///Users/brianlong/Developer/summit/server/src/services/AdvancedSecurityObservabilityService.ts). |

## 2. Availability (Illustrative)

The Availability category addresses the accessibility of the system as stipulated by a contract or service level agreement.

| SOC 2 Criteria (Illustrative) | Control ID(s) | Evidence Summary |
| :--- | :--- | :--- |
| **A1.1 Capacity Management** | `SI-4`, `GOV-005` | Real-time observability hooks in `EnhancedGovernanceRBACService` track authorization latencies and throughput. |
| **A1.2 System Monitoring & Recovery** | `SI-4`, `CICD-003` | Automated health checks in `fips-compliance.ts` monitor HSM availability. Resource protection and cost-based rate limiting enforced by [cost-guard.ts](file:///Users/brianlong/Developer/summit/server/src/services/cost-guard.ts). |

## 3. Confidentiality (Illustrative)

The Confidentiality category addresses the protection of "confidential" information, as defined by the organization.

| SOC 2 Criteria (Illustrative) | Control ID(s) | Evidence Summary |
| :--- | :--- | :--- |
| **C1.1 Data Classification & Protection** | `SEC-001`, `AUD-WORM` | Secured via [worm-audit-chain.ts](file:///Users/brianlong/Developer/summit/server/src/federal/worm-audit-chain.ts) and [ledger.ts](file:///Users/brianlong/Developer/summit/server/src/provenance/ledger.ts) (ProvenanceLedgerV2) utilizing S3 Object Lock, Merkle tree hashing, and hash-chaining. |
| **C1.2 Access Restriction** | `AC-1`, `IA-2` | All data access restricted by `EnhancedGovernanceRBACService` ensuring least-privilege for all intelligence-consequential actions. |

## 4. Not Applicable Controls

Certain SOC 2 criteria may not be applicable to the Summit platform at this stage. For example, criteria related to physical security of data centers are managed by our cloud infrastructure providers.
