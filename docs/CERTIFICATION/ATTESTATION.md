# External Attestation & Trust Signals

Trust must be visible to be useful. This covers how certification is signaled to the outside world.

## 1. Public Trust Signals

### 1.1 The "Certified" Badge
*   **Visual:** Standard SVG assets hosted on the trust registry.
*   **Verification:** Clicking the badge leads to the registry entry for that specific entity.
*   **Anti-Tamper:** Badges are dynamically generated with a current timestamp to prevent replay of stale screenshots.

### 1.2 Machine-Verifiable Certificates
*   **Format:** X.509 or VC (Verifiable Credentials / W3C).
*   **Usage:**
    *   Deployments present certs during TLS handshake (mTLS).
    *   Plugins include signed manifests verified at install time.

## 2. Third-Party Attestation Hooks

To support **Level 3 (Audited)** certification, the platform provides specific hooks for external auditors.

### 2.1 The "Auditor Access" Role
A special RBAC role (`role:auditor`) that grants:
*   Read-only access to configuration.
*   Read-only access to `audit_logs` (including immutable history).
*   No access to user data (PII redacted).

### 2.2 Compliance Exports (Packs)
Automated generation of evidence packs mapped to standard frameworks:
*   **SOC 2 Pack:** Security, Availability, Confidentiality evidence.
*   **GDPR Pack:** Data map, deletion logs, consent records.
*   **ISO 27001 Pack:** ISMS policy status, risk register snapshots.

## 3. Transparency Reports
The platform commits to publishing a quarterly transparency report covering:
*   Number of certified partners/plugins.
*   Number of revocations (and generalized reasons).
*   Government data requests (Warrant Canary).
