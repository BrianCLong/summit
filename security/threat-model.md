# Summit Threat Model (STRIDE)

## Scope & Assumptions
- Components: API/GraphQL Gateway, OPA policy plane, Postgres, Neo4j, Redis, Kafka, OpenTelemetry, and supporting CI/CD.
- Guardrails: Mandatory mTLS between services, policy enforcement via OPA/ABAC, ability to deploy in offline/air-gapped environments.
- Tenancy: Multi-tenant control plane with optional ST-DED pods; tenant data tagged and encrypted with per-tenant keys.

## Assets & Trust Boundaries
| Asset | Description | Primary Owner |
| --- | --- | --- |
| Customer intelligence data | Graph entities and relationships in Neo4j | Data Platform |
| Compliance ledger | Postgres schemas containing audit and billing | Governance |
| Policy bundles | Signed Rego bundles controlling access decisions | Security Engineering |
| Event fabric | Kafka topics and schema registry | Platform Engineering |
| Operational telemetry | Traces/logs/metrics exported via OTel | SRE |

Trust boundaries exist between: external clients ↔ API gateway, gateway ↔ internal services (OPA, data stores), control plane ↔ data plane clusters, and CI/CD ↔ runtime.

## STRIDE Analysis
| Threat | Vector | Impact | Mitigations | Backlog Link |
| --- | --- | --- | --- | --- |
| **Spoofing** | Compromised service attempts to impersonate gateway | Unauthorized data access, tenant isolation breach | SPIFFE-issued mTLS certs, OPA identity checks, Kafka ACLs | `RBAC-102`, `SECR-102`
| **Tampering** | Malicious actor modifies policy bundle in transit | Privilege escalation, policy bypass | Signed bundles, bundle verification on load, supply chain attestations | `EVID-101`, `RBAC-102`
| **Repudiation** | Tenant disputes GraphQL mutation | Immutable audit logs, request tracing with tenant tags | Append-only Postgres ledger, OTel span exports with WORM storage | `BACKUP-101`
| **Information Disclosure** | Cached GraphQL responses leak between tenants | Namespaced Redis shards, tenant-scoped cache keys, ABAC gating | Cache design per ADR-0005, automated integration tests | `RBAC-101`
| **Denial of Service** | Tenant issues expensive NL→Cypher queries | Gateway saturation, graph slowdown | Rate limits, query cost caps, kill switches, autoscaling | `NLC-102`
| **Elevation of Privilege** | Insider tries to expand permissions via direct DB access | Hard secrets rotation, database network isolation, RBAC | Vault-managed creds, bastion approvals, periodic audits | `SECR-102`, `RBAC-101`

## Abuse & Misuse Cases
1. **Graph Query Flooding**: A tenant repeatedly issues complex Cypher queries to exhaust Neo4j resources. Mitigation: per-tenant rate limits, query timeout enforcement, automated alerts mapped to story `NLC-102`. Blast radius limited to tenant shard due to resource quotas.
2. **Policy Poisoning in Offline Deployments**: In an air-gapped site, an operator loads an unsigned Rego bundle. Mitigation: enforce signature validation before activation, maintain offline key escrow, align with `EVID-101` for attestation gating. Blast radius restricted to the isolated site; deny-by-default on validation failure.
3. **Cache Confusion Attack**: A malicious tenant attempts to exploit shared Redis caches to retrieve another tenant's data. Mitigation: tenant-prefixed cache keys, ACLs, and automated scanning via `RBAC-101`. Blast radius capped at cache tier; cache flush procedure prevents persistent leakage.
4. **Credential Drift in CI/CD**: Secrets drift leads to outdated mTLS certificates deployed from CI, weakening spoofing defenses. Mitigation: automated drift detection and policy enforcement from `SECR-102`. Blast radius limited to the impacted environment due to per-environment PKI authorities.
5. **Backup Theft**: Insider copies Postgres backups to an unauthorized location. Mitigation: encryption-at-rest, object-lock retention, quarterly restore drills (`BACKUP-101`). Blast radius contained by monitoring DLP alerts and limiting access to backup networks.

## Compensating Controls
- **Continuous Policy Testing**: OPA bundles tested via CI pipelines to catch regressions before deployment (`RBAC-102`).
- **Supply Chain Integrity**: Mandatory attestations for container images and policies, enforced by CI gates (`EVID-101`).
- **Operational Drills**: Routine backup/restore, rate-limit validation, and incident response exercises align with backlog work (`BACKUP-101`, `NLC-102`).
- **Secrets Governance**: Automated checks detect plaintext secrets and enforce rotation thresholds (`SECR-102`).

## Residual Risk & Monitoring
- Residual DoS risk from legitimate high-volume tenants is mitigated through contractual rate caps and observability dashboards. Telemetry routed via OTel includes tenant tags to expedite containment.
- Blast radius for policy or cache failures confined to tenant cohort pods (shared vs ST-DED) by design.
- Regular reviews ensure threat model stays aligned with backlog execution; updates tracked alongside stories in `backlog/backlog.json`.
