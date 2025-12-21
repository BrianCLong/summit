# API Charter & Governance

**Version:** 1.0.0
**Effective Date:** October 2025
**Owner:** Platform Engineering

## 1. Vision & Purpose

APIs are the primary product of the IntelGraph platform. They must be treated with the same rigor as our user interfaces: designed for usability, reliability, and security. This charter defines the standards for all API surfaces exposed by the platform.

**Core Principle:** Contracts are law; APIs must behave like law.

## 2. API Surface Classification

We classify all API surfaces into three tiers to determine their SLOs, support commitments, and governance requirements.

### Tier 0: Critical Infrastructure (The "Dial Tone")
*   **Definition:** APIs essential for system access, billing, and core tenancy. If these are down, the customer cannot use the product at all.
*   **Examples:** Authentication (`/auth/*`), Tenant Management (`/api/tenants/*`), Billing (`/api/billing/*`), Admin Access.
*   **SLOs:**
    *   Availability: 99.99%
    *   p95 Latency: < 100ms
    *   Error Rate: < 0.01%
*   **Support:** 24/7 on-call.
*   **Breaking Changes:** Never, without 12-month deprecation window and major version increment.

### Tier 1: Core Product (The "Value")
*   **Definition:** APIs that drive the main user workflows and integrations.
*   **Examples:** Webhooks (`/api/webhooks/*`), Maestro Runs (`/api/maestro/*`), Search (`/api/search/*`), Case Management (`/api/cases/*`).
*   **SLOs:**
    *   Availability: 99.9%
    *   p95 Latency: < 350ms (Read), < 700ms (Write)
    *   Error Rate: < 0.1%
*   **Support:** Business hours on-call (SLA).
*   **Breaking Changes:** 6-month deprecation window.

### Tier 2: Internal / Experimental / Auxiliary
*   **Definition:** APIs for internal tooling, experimental features, or non-critical integrations.
*   **Examples:** Narrative Simulation (`/api/narrative-sim/*`), Internal Command Console (`/api/internal/*`), Prototype endpoints.
*   **SLOs:**
    *   Availability: 99.0%
    *   p95 Latency: Best effort (< 2s)
    *   Error Rate: < 1%
*   **Support:** Best effort.
*   **Breaking Changes:** 1-month warning (or immediate for experimental flagged features).

## 3. "What is an API" Policy

1.  **No Stealth Endpoints:** Every endpoint must be defined in the OpenAPI specification or GraphQL schema.
2.  **No Undocumented RPCs:** Function calls over HTTP that are not RESTful or GraphQL must be explicitly registered in the Exceptions Registry.
3.  **Ownership Required:** Every API route must map to a specific domain owner in `server/src/routes/endpoint-ownership.ts` (to be created).

## 4. Ownership & Accountability

*   **Domain Owner:** Responsible for the design, implementation, and maintenance of the API.
*   **On-Call:** Tier 0/1 APIs must have a mapped PagerDuty service.
*   **SLA:** Owners must respond to support tickets regarding their APIs within defined SLAs (Sev1: 1h, Sev2: 4h).

## 5. Support & Deprecation Policy

*   **Versioning:** We use URL versioning (`/api/v1/...`) or Header versioning (`X-API-Version`).
*   **Deprecation Window:**
    *   **Tier 0:** 12 months.
    *   **Tier 1:** 6 months.
    *   **Tier 2:** 1 month.
*   **Communication:** All deprecations must be announced via the Developer Portal and email to affected consumers.
*   **Sunset Headers:** Responses from deprecated APIs must include `Deprecation` and `Sunset` HTTP headers.

## 6. Authentication & Authorization

*   **Allowed Patterns:**
    *   **User Auth:** OIDC / OAuth2 via Bearer Token.
    *   **System Auth:** Scoped Service Tokens (API Keys) with rotation capabilities.
    *   **Partner Integration:** mTLS or IP Allowlists combined with API Keys.
*   **Forbidden:**
    *   Basic Auth (username:password).
    *   Shared "God Tokens".
    *   Unauthenticated endpoints (except specific public assets or health checks).
*   **Least Privilege:** All endpoints must enforce scopes (e.g., `read:cases`, `write:runs`).

## 7. Exceptions Registry

Non-standard APIs (e.g., legacy SOAP, ad-hoc RPC) must be registered in `docs/API_EXCEPTIONS.md` with an expiry date. Any unregistered non-standard API is subject to immediate deletion.

## 8. Naming & Modeling Conventions

*   **Resources:** Plural nouns (`/users`, `/cases`).
*   **Actions:** Standard HTTP verbs (`GET`, `POST`, `PUT`, `DELETE`).
*   **Non-CRUD Actions:** Use sub-resources or specific verbs (`POST /runs/:id/cancel`).
*   **Casing:** CamelCase for JSON fields, Kebab-Case for URLs.
*   **Dates:** ISO 8601 (`YYYY-MM-DDTHH:mm:ssZ`).

## 9. Quarterly Surface Review

A quarterly review will be conducted to:
1.  Verify inventory accuracy.
2.  Identify unused endpoints for deletion.
3.  Ensure compliance with this Charter.
4.  Set deletion goals (e.g., "Delete 1 legacy version per quarter").

---
*Authorized by the API Governance Council*
