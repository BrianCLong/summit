# Threat Control Matrix

This matrix maps identified threats to implemented controls and assesses the residual risk.

| Threat Category | Threat ID | Threat Description | Likelihood | Impact | Control(s) | Residual Risk |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Spoofing** | S-01 | JWT Forgery | Low | Critical | `productionAuthMiddleware` validates signature (RS256) and expiration. | Low |
| **Spoofing** | S-02 | Webhook Impersonation | Medium | High | HMAC-SHA256 signature verification for all webhook providers (Stripe, Slack). | Low |
| **Tampering** | T-01 | Audit Log Modification | Low | Critical | WORM storage pattern; `ProvenanceLedger` uses cryptographic chaining. | Low |
| **Tampering** | T-02 | Dependency Poisoning | Medium | High | `pnpm-lock.yaml`, CI dependency scanning, Renovate bot limits. | Medium |
| **Repudiation** | R-01 | Admin Actions | Low | High | `auditLogger` captures all admin mutations with IP/User/Tenant context. | Low |
| **Information** | I-01 | PII Leak to LLM | High | High | `piiGuardMiddleware` (Presidio/Regex) redacts entities before LLM context. | Low |
| **Information** | I-02 | Cross-Tenant Leak | Low | Critical | `tenantContextMiddleware` + RLS patterns + `TenantIsolationGuard` in app layer. | Low |
| **DoS** | D-01 | API Flooding | High | Medium | `advancedRateLimiter` (Redis-based sliding window) per IP/Tenant. | Low |
| **DoS** | D-02 | GraphQL Complexity | Medium | High | `depthLimit(6)`, `rateLimitAndCache` plugin. | Low |
| **Elevation** | E-01 | Role Bypass | Low | Critical | `ensureRole` middleware; OPA policy enforcement at gateway. | Low |
| **Elevation** | E-02 | Tenant Escape | Low | Critical | Strict checking of `route.tenantId` vs `token.tenantId` in middleware. | Low |

## Risk Acceptance

*   **RA-01**: **Insider Threat (DB Admin)**. We accept the risk that a malicious database administrator with direct SQL access could modify data.
    *   *Rationale*: Mitigation requires database-level audit plugins which are planned for next quarter.
    *   *Current Control*: Access is restricted to 2 senior engineers via bastion host.
*   **RA-02**: **Model Hallucination in Security Advice**. We accept that the "Security Copilot" feature may give incorrect advice.
    *   *Rationale*: Inherent limitation of LLMs.
    *   *Current Control*: UI disclaimers ("Human verification required").
