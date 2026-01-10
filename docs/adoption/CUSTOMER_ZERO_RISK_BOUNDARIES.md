# Customer Zero Risk Boundaries

**Objective:** To clearly define the scope of the Customer Zero evaluation, including supported capabilities, deferred features, and critical security boundaries.

This document is not a list of known issues; it is a guide to safe and effective evaluation.

---

## 1. In-Scope GA Capabilities

This evaluation is strictly bounded to the General Availability (GA) feature set. These are the capabilities that have been hardened, tested, and are fully supported. They include:

*   **Identity & Access Management:** OIDC-based authentication, RBAC, and ABAC.
*   **Data Ingestion & Integrity:** Schema-validated ingestion and immutable provenance.
*   **Maestro Orchestrator:** Human-in-the-loop workflow management.
*   **Core Security Posture:** Tenant isolation, rate limiting, and input validation.

Any capability not on this list is considered out of scope for this evaluation.

---

## 2. Out-of-Scope (Deferred Capabilities)

The following capabilities are **explicitly out of scope** for this evaluation. They are part of the future Summit roadmap but are not part of the GA release. Their absence is a deliberate design choice to ensure the stability and security of the core platform.

*   **Autonomous Agent Loop:** The "Agentic Mesh" is disabled. All workflows require human initiation.
*   **Real-time Cognitive Warfare Defense:** The "PsyOps" module is in a passive, analysis-only mode.
*   **Predictive Geopolitics:** The "Oracle" subsystem is not enabled.

**Do not attempt to enable or test these features.** They are not configured for production use and are not covered by support SLAs.

---

## 3. Critical Security Boundaries for Production

The Summit Platform is engineered for security, but this security relies on correct configuration. The following points are not risks with the software itself, but rather **operational risks that you must mitigate in your environment.**

*   **Tenant Isolation Depends on Correct Authentication:**
    *   **Boundary:** The platform's ability to isolate tenant data is critically dependent on a properly configured OIDC-compliant identity provider. The platform **trusts the JWT** issued by your provider.
    *   **Your Responsibility:** Ensure that your identity provider is secure and that JWTs cannot be forged or tampered with. Do not use un-signed tokens or weak secrets. The platform should be configured to validate the JWT signature against your provider's public keys (JWKS).

*   **Production Mode Must Be Enforced:**
    *   **Boundary:** The platform's security posture is hardened when `NODE_ENV` is set to `production`. Development-only features, such as relaxed authentication rules for local testing, are disabled in this mode.
    *   **Your Responsibility:** **You must ensure `NODE_ENV=production` is set** in all production environments. Failure to do so may result in security controls being inadvertently disabled.

*   **API Keys and Secrets Must Be Managed:**
    *   **Boundary:** The platform uses API keys and other secrets for programmatic access. The security of these secrets is your responsibility.
    *   **Your Responsibility:** Do not use default or weak secrets. Implement a robust secret management policy, including regular rotation.

*   **Rate Limiting is a Critical Defense:**
    *   **Boundary:** The platform includes powerful, configurable rate limiting to protect against abuse and denial-of-service attacks.
    *   **Your Responsibility:** Configure the rate limits to match your expected usage patterns. Do not disable them. Ensure the backing Redis instance is properly secured and scaled.

---

This document establishes the "guardrails" for your evaluation. By staying within these boundaries, you can ensure a safe, productive, and successful evaluation of the Summit Platform.
