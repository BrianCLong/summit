# Security Hardening Backlog

This backlog tracks security improvements identified during the threat modeling process that were not critical enough to block the current release but should be addressed in upcoming sprints.

| Priority | ID | Title | Description | Proposed Sprint |
| :--- | :--- | :--- | :--- | :--- |
| **P2** | SEC-01 | **Database-Level Audit Logging** | Currently, audit logging happens in the application layer (`auditLogger`). A compromised app could bypass this. We need to enable `pgAudit` and Neo4j Query Logging to capture direct DB access. | Next Quarter |
| **P2** | SEC-02 | **Content Security Policy (CSP) Strictness** | The current CSP allows `unsafe-inline` styles for some UI components. Refactor UI to eliminate this requirement. | UX Polish |
| **P3** | SEC-03 | **Automated Secret Rotation** | Database and JWT secrets are static. Implement HashiCorp Vault or AWS Secrets Manager for automated daily rotation. | Ops Excellence |
| **P3** | SEC-04 | **Advanced Bot Detection** | `advancedRateLimiter` handles volume, but not sophisticated low-and-slow bot attacks. Integrate Cloudflare or similar WAF bot management. | Scale |
| **P3** | SEC-05 | **Internal mTLS** | Service-to-service communication (e.g., API to Worker) is currently over cleartext internal network. Implement Linkerd or Istio mTLS. | Zero Trust |
