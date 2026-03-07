# Secrets & Key Management Standard

## Purpose and Scope

This standard defines how CompanyOS handles secrets, keys, and sensitive configuration across all services, tenants, and environments. The goal is zero plaintext secrets in code or configuration repositories, deterministic rotation, and full traceability for access.

## Canonical Secret Model

| Type                 | Examples                                                   | Scope                                                                   | Ownership                                                 | Storage                                                     | Rotation Target                                       |
| -------------------- | ---------------------------------------------------------- | ----------------------------------------------------------------------- | --------------------------------------------------------- | ----------------------------------------------------------- | ----------------------------------------------------- |
| API keys & tokens    | Third-party API keys, OAuth client secrets, webhook tokens | Per-service, per-environment; tenant-specific when needed               | Service team; delegated tenant admin for BYO integrations | KMS-wrapped values stored in the secrets manager            | Every 90 days or vendor requirement                   |
| Database credentials | RDS/CloudSQL users, analytics readers, cache auth          | Per-service, per-environment; tenant DB users when isolated             | DB platform SRE; service team for app users               | Ephemeral credentials issued via broker backed by KMS       | Every 30 days; rotate immediately on personnel change |
| Encryption keys      | Data-at-rest (DEK/KEK), signing keys, envelope keys        | Per-tenant for customer data; per-service for shared control-plane data | Security platform team (KEK), service team (DEK usage)    | HSM-backed KMS with rotation schedule and key policies      | KEK annually; DEK every 90 days or on key-event       |
| Machine identities   | mTLS certs, SPIFFE/SPIRE SVIDs, workload tokens            | Per-workload, per-environment                                           | Platform identity team                                    | Short-lived certs/tokens issued from CA integrated with HSM | Lifetime ≤24h; rotate on redeploy                     |
| Human access tokens  | Break-glass credentials, admin tokens                      | Per-role, environment-bound                                             | Security & Compliance                                     | PAM vault with hardware-backed MFA                          | Rotate after each use; expire ≤8h                     |

### Metadata & Tagging

All secrets must carry metadata: `owner`, `service`, `environment`, `tenant`, `data-classification`, `rotation-period`, and `last-rotated`. Missing metadata blocks distribution.

### Segmentation & Least Privilege

- Tenants: default isolation per tenant; shared control-plane secrets disallow data-plane access.
- Environments: dev/test secrets never reused in prod; prod-only access via production identity.
- Services: each microservice has its own secret namespace and IAM role; no cross-service sharing.

## Key Management Architecture (Conceptual)

1. **Root of trust**: Hardware-backed KMS/HSM issues KEKs; DEKs are envelope-encrypted and stored only as wrapped blobs.
2. **Secret manager**: Central service holds encrypted blobs and metadata; enforces RBAC/ABAC and emits audit logs.
3. **Access path**:
   - **Workload identity** (SPIFFE/mTLS/OIDC SA token) authenticates to the secret manager.
   - **Authorization** via policy engine (e.g., Rego) evaluates metadata + service identity + environment guardrails.
   - **Delivery** through one of three patterns:
     - **Init/sidecar injector** mounts secrets as tmpfs files with restricted permissions.
     - **Runtime SDK** fetches just-in-time with caching TTL ≤5m, auto-refresh before expiry.
     - **Environment injection** (build-time prohibited; deploy-time only) sourced from secret manager; never stored in images.
4. **Auditing**: Every access emits structured logs (`who`, `what`, `when`, `where`, `why`, `justification`, `correlation-id`) to an immutable ledger with anomaly detection on rate/entropy.

## Access Control, AuthN/Z, and Policy

- **Identity**: Services authenticate via workload identity (SPIFFE/SPIRE or cloud-native service accounts). Humans authenticate via SSO + MFA; emergency access via PAM with time-bound approvals.
- **Authorization**: Attribute-based policies enforce `service == owner`, environment match, tenant isolation, and data-classification constraints. Manual approvals required for `prod + pii` secrets when rotation deviates from schedule.
- **Just-in-time grants**: Temporary scopes with expiry and automatic revocation; no permanent broad grants.
- **Network**: Secret manager reachable only over mTLS; egress filtering prevents exfiltration paths; secrets never traverse message queues or logs.

## Developer UX & Guardrails

- **Referencing secrets in code**: Use logical names (e.g., `SECRET_REF=secret://payments/prod/stripe/api-key`). Never inline values. Configuration libraries resolve refs via SDK/sidecar.
- **Local development**: Developers receive scoped, expiring dev secrets via CLI that writes to local dev vault; automatic cleanup on TTL expiry.
- **Linting & leak prevention**:
  - Pre-commit hooks run `detect-secrets` and entropy scanners; blocked on findings.
  - CI enforces secret scanning (code, images, IaC) and denies merges on hits until a security engineer triages.
  - Structured logging redaction and egress proxies prevent accidental leaks; log schemas explicitly mark `secret` fields for suppression.
- **Rotation UX**: One command/PR flow (`secrets rotate <name> --env prod`) triggers orchestrated rotation, updates consumers, performs health checks, and rolls back on failure.
- **Revocation**: `secrets revoke <name>` disables distribution, revokes tokens/creds, and triggers incident runbook.

## Rotation & Revocation Workflow

1. Initiate rotation with ticket/JIRA ID and justification; validate metadata completeness.
2. Secret manager generates new version via KMS/HSM; stores wrapped blob and metadata.
3. Deployment orchestrator rolls out new version to staged targets using blue/green or canary; monitors health.
4. Update-dependent resources (DB users, API clients) via automation; revoke old version after validation window.
5. Audit trail finalized with before/after versions, approver, and automated checks.

## Example Secret Lifecycle

1. **Provision**: Service owner requests secret; policy engine ensures namespace ownership and metadata. Secret manager generates value using HSM RNG and stores wrapped blob.
2. **Distribute**: Workload identity authenticates; sidecar injects secret at pod start with tmpfs mount; SDK refreshes before TTL expiry.
3. **Use**: Application reads from file or SDK; never persists to disk/logs. Observability tags access with `secret-id` (non-sensitive) for forensics.
4. **Rotate**: Scheduled job triggers rotation; new version deployed via canary; old version retained for max 24h rollback window then revoked.
5. **Revoke**: Upon compromise, secret manager disables all active versions, invalidates downstream tokens/DB users, and notifies paging channels.
6. **Delete**: After retention (e.g., 30 days) and verification of no references, key material is destroyed in KMS and metadata tombstoned.

## Baseline Threat Model (STRIDE-oriented)

- **Spoofing**: Mitigated via strong workload identity (mTLS/SPIFFE) and MFA for humans.
- **Tampering**: Secrets encrypted at rest with KEK/DEK; audit log integrity via append-only ledger and MACs.
- **Repudiation**: Mandatory justification and correlation IDs on access; immutable audit stream with real-time forwarding to SIEM.
- **Information Disclosure**: No plaintext in repos/images; egress controls, TLS everywhere, redaction in logs/metrics; secrets scoped per service/tenant.
- **Denial of Service**: Rate limits and backoff on secret fetch; cached secrets with TTL; regional replicas of secret manager.
- **Elevation of Privilege**: ABAC policies, just-in-time grants, break-glass isolation, and mandatory two-party approvals for prod PII secrets.

## Operational Excellence & SRE Hooks

- **SLOs**: Secret fetch p95 < 150ms; availability ≥ 99.95%; rotation success rate ≥ 99%.
- **Runbooks**: Incident playbooks for leak detection, failed rotation, compromised root keys, and audit gaps.
- **Observability**: Metrics for fetch latency, cache hit rate, rotation duration, and access anomalies; traces tagged with `secret-ref` (hashed).

## Forward-Looking Enhancements

- **Deterministic ephemerality**: Expand to per-request one-time-use tokens for high-risk operations.
- **Confidential computing**: Evaluate enclaves for in-memory secret handling in untrusted environments.
- **Policy-as-code verification**: Integrate formal verification (e.g., OPA + Conftest + TLA+) for rotation workflows and access policies.
