# SUI Security, Privacy, and Abuse-Resistance

## Security objective

Protect insurer portfolio intelligence, leaked-info derived signals, and underwriting decisions while
preserving deterministic replay and auditability.

## MAESTRO alignment

- **MAESTRO Layers:** Data, Agents, Tools, Infra, Observability, Security.
- **Threats Considered:** data exfiltration, OSINT poisoning, prompt injection in analyst copilots,
  privilege escalation, supply-chain compromise, evidence tampering.
- **Mitigations:** tenant envelope encryption, policy-as-code checks, source reputation weighting,
  immutable evidence bundles, signed SBOM/provenance, scoped agent tool permissions.

## Trust boundaries

1. External connectors (untrusted ingestion boundary).
2. Tenant-isolated storage and compute domains.
3. Model execution and feature generation boundary.
4. Human/agent action boundary for underwriting decisions.
5. Evidence artifact publication boundary.

## Control requirements

### Tenant isolation

- Hard tenancy partitioning by `tenantId` at storage, queue, and compute layers.
- Dedicated KMS data keys per tenant and region.
- Policy rule: cross-tenant joins are denied by default and audited.

### PII minimization for leak artifacts

- Raw leak artifacts stored encrypted and restricted to high-trust roles.
- Default model features consume only derived, hashed, and severity-normalized signals.
- Artifact retention windows are policy-bound and auto-expired.

### Audit logging and decision reversibility

- Append-only audit stream for score requests, policy decisions, and agent actions.
- Every autonomous recommendation must include rollback trigger + rollback runbook pointer.
- Decision ledger entries link to evidence bundles and model versions.

### Anti-poisoning and data quality defenses

- Source reputation scoring and corroboration threshold across independent feeds.
- Duplicate and replay detection for leaked artifacts and exploit chatter.
- Confidence downgrades when source diversity or temporal consistency drops.

### Abuse prevention

- Purpose-based access control (underwriting, monitoring, remediation contexts).
- Action throttles and anomaly detection on export/API scraping patterns.
- Explicit denial for unsupported use-cases (surveillance/profiling abuse).

## CI security checks (required)

1. Policy lint + policy unit tests.
2. Secret scanning and dependency vulnerability scanning.
3. SBOM generation and signature verification.
4. Determinism/evidence integrity checks.
5. Tenant isolation integration tests.

## GA security gates

- **Gate 1:** tenant isolation test pass with no cross-tenant data bleed.
- **Gate 2:** leak artifact encryption + key rotation verified.
- **Gate 3:** audit log tamper-evidence verified.
- **Gate 4:** abuse controls validated (rate limiting + policy denials).
- **Gate 5:** SBOM and provenance attestations present per release artifact.

## `docs/sui/security.md` operational outline

- Threat model + abuse cases
- Data classification and handling matrix
- Identity/access model and RBAC/ABAC policies
- Crypto/key management standards
- Incident response and forensic evidence workflow
- GA control checklist and evidence mapping
