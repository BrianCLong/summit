# Procurement Readiness Checklist (FedRAMP-aligned)

This checklist tracks Summit's capabilities for high-compliance deployments, including FedRAMP Moderate and equivalent standards.

### 1) System Boundary & Inventory
- [x] System boundary diagram (components, data flows, trust boundaries)
- [x] Asset inventory (services, images, dependencies, ports)
- [x] Data inventory + classification (PII/PHI/CUI/etc.)
- [x] External services list (and how to disable/replace for air-gap)

### 2) Identity, Auth, Access (IA family)
- [x] SSO support (SAML/OIDC) + RBAC roles defined
- [x] MFA enforceable for privileged roles
- [x] Break-glass procedure documented + audited
- [x] Least privilege defaults + role templates

### 3) Audit Logging & Monitoring (AU / SI)
- [x] Centralized audit logs (append-only or tamper-evident)
- [x] Log retention policy (configurable) + export controls
- [x] Alerting rules for high-risk events (policy denials, auth anomalies)
- [x] Time sync strategy (NTP alternatives for air-gap)

### 4) Configuration & Change Management (CM)
- [x] Immutable infrastructure guidance (images/helm pinned by digest)
- [x] Drift detection + reporting (via Trust Dashboard)
- [x] Change approval workflow (CI gating + signed releases)
- [x] Baseline configs per environment

### 5) Vulnerability & Patch Management (RA / SI)
- [x] SBOM generated and stored per release (CycloneDX)
- [x] Vulnerability scanning integrated; criticals block release
- [x] Patch cadence documented (e.g., monthly) + emergency patch process
- [x] Dependency update policy + exception handling

### 6) Incident Response (IR)
- [x] IR runbook (triage, containment, eradication, recovery)
- [x] Evidence capture steps (logs, attestations, provenance packet)
- [x] Customer notification SLAs (configurable)
- [x] Post-incident review template

### 7) Contingency / Backups / DR (CP)
- [x] Backup strategy (Neo4j, Postgres, object store, configs)
- [x] Restore testing procedure + cadence
- [x] RPO/RTO targets documented per profile
- [x] Key recovery / rotation procedures

### 8) Encryption & Key Management (SC)
- [x] Encryption in transit everywhere (mTLS where possible)
- [x] Encryption at rest for data stores
- [x] Key management options (offline keys, HashiCorp Vault)
- [x] Key rotation & revocation documented

### 9) SDLC & Supply Chain (SA)
- [x] Signed artifacts (cosign) + provenance attestations
- [x] Reproducible builds (documented and enforced)
- [x] SAST/DAST/secret scanning in CI
- [x] Third-party component policy and approvals

### 10) Documentation Package (what buyers request)
- [x] System Security Plan (SSP) starter pack
- [x] Architecture + data flow diagrams
- [x] Control implementation summary (CIS)
- [x] Trust Packet per release (SBOM + signatures + checks)
- [x] Admin/operator guides + hardening guide
