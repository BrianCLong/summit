# Summit Security Model: Evidence & Lineage Integrity

## Threat Model (STRIDE Focus)

* **Spoofing**: Tampering with evidence chain-of-custody. Mitigated by cryptographic signatures (ed25519) on all evidence bundles.
* **Tampering**: Altering stored artifacts or raw captures. Mitigated by content-addressed storage and hash verification.
* **Repudiation**: Denying actions or policy decisions. Mitigated by comprehensive audit logging and policy decision tracking in `stamp.json`.
* **Information Disclosure**: Cross-tenant data leakage. Mitigated by strict namespace isolation, per-tenant encryption keys, and role-based access control (RBAC).
* **Denial of Service**: Resource exhaustion via malicious modules. Mitigated by sandbox resource limits (CPU/memory caps) and strict execution timeouts.
* **Elevation of Privilege**: Sandbox escapes or SSRF. Mitigated by seccomp/AppArmor, no host mounts, and mandatory routing through the Ingest & Capture Proxy.

## Key Management

* **Tenant Keys**: Each tenant is assigned a dedicated ed25519 keypair for signing evidence bundles.
* **Rotation**: Keys are rotated on a scheduled basis (e.g., 90 days) or immediately upon suspected compromise.
* **Storage**: Private keys are securely stored in an external secrets manager (e.g., AWS Secrets Manager, HashiCorp Vault).

## Policy-as-Code & Egress Control

* **Egress Policy**: All outbound network traffic from the Module Runtime MUST route through the Ingest & Capture Proxy. Direct egress is blocked at the network level.
* **Source Allowlists**: The Capture Proxy enforces tenant-specific allowlists for target domains and IP ranges.

## CI Security Gates

* **Determinism Check**: Pipelines must produce identical output hashes (`report.json` + `stamp.json`) across multiple runs using the same inputs.
* **Sandbox Verification**: Automated tests ensure the runtime environment prevents unauthorized host access or SSRF attempts.
* **Dependency Scanning**: Continuous scanning for vulnerable third-party libraries (SBOM generation).
