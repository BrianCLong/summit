# SECURITY DEFERRED RISKS — SUMMIT MVP-4 GA

**Date:** 2025-12-30
**Owner:** Security Lead / Release Captain
**Status:** **ACTIVE** - Required Reading for Ops/Deployment

This document formally accepts specific security risks for the MVP-4 General Availability release. These risks are mitigated by architecture, scope limitations, or operational controls.

---

## 1. Beta Service Authentication (Humint, Decision, Marketplace)

*   **Risk ID:** DR-001 (Ref: AUTH-CRIT-001, AUTH-CRIT-002)
*   **Description:** Several microservices (`humint-service`, `decision-api`, `marketplace`) implement insecure authentication (no signature verification) or contain hardcoded development bypasses.
*   **Mitigation Strategy:** **Network Isolation & Scope Exclusion**
    *   These services are designated **Beta/Experimental** and are NOT supported for production use in GA.
    *   They are **NOT** exposed via the public Ingress/Load Balancer in the standard production topology.
    *   If deployed, they must sit behind the `sandbox-gateway` or be accessible only via internal VPN.
*   **Acceptance Justification:** Use of these services is opt-in for "Sandbox" environments only. They are not part of the core "Supported Capabilities".
*   **Next Steps:** Implement standard OIDC middleware in all services for v1.1.

## 2. Tenant Identity Header Trust

*   **Risk ID:** DR-002 (Ref: AUTHZ-CRIT-003)
*   **Description:** The core backend (`server/src`) middleware trusts the `x-tenant-id` HTTP header for tenant context. If a malicious user can send this header directly to the backend, they can impersonate any tenant.
*   **Mitigation Strategy:** **Gateway Enforcement (Ingress Filtering)**
    *   The `sandbox-gateway` (public entry point) validates the JWT signature and extracts the `tenantId` from the verified token claims.
    *   **CRITICAL REQUIREMENT:** The production deployment **MUST** ensure `sandbox-gateway` is the only path to `server`.
    *   Direct access to `server` ports (default 4000) from the public internet **MUST** be blocked by firewall/security groups.
*   **Acceptance Justification:** Standard microservice pattern where the Gateway handles AuthN and downstream services trust the Gateway. Secure as long as the network boundary is intact.
*   **Next Steps:** Refactor `server` middleware to validate JWTs directly or require mTLS/Service-to-Service auth tokens for v1.1.

## 3. Internal Tooling Vulnerabilities (Injection/Pickle)

*   **Risk ID:** DR-003 (Ref: INJ-CRIT-004, INJ-CRIT-005)
*   **Description:** Python administrative tools (`tools/symphony.py`) and data pipeline scripts use `subprocess.run(shell=True)` and `pickle.loads`, presenting Remote Code Execution (RCE) risks if inputs are controlled by attackers.
*   **Mitigation Strategy:** **Access Control**
    *   These tools are not web-accessible. They are executed via CLI by privileged engineers or via secure CI/CD pipelines.
    *   They operate on internal, trusted data sources (e.g., config files, data warehouse).
*   **Acceptance Justification:** Attack surface is limited to internal bad actors with existing high privileges.
*   **Next Steps:** Refactor tools to use `subprocess` list arguments and JSON serialization for v1.1.

## 4. Rate Limiting Fail-Open

*   **Risk ID:** DR-004 (Ref: RATE-CRIT-009)
*   **Description:** The rate limiter defaults to "Allow" (Fail-Open) if Redis is unavailable.
*   **Mitigation Strategy:** **Infrastructure Resilience**
    *   Redis is deployed with high availability (or managed service) in production.
    *   DDoS protection is provided at the edge (Cloud/WAF layer), serving as the primary defense.
*   **Acceptance Justification:** Fail-open is preferred for availability over strict blocking during partial outages for this MVP phase.
*   **Next Steps:** Implement configurable Fail-Closed mode for high-security endpoints for v1.1.
