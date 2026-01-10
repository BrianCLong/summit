# Summit MVP-4 GA Release Notes

**Version:** 1.0.0
**Date:** 2025-12-30
**Codename:** Summit GA
**Status:** **General Availability (Restricted Scope)**

---

## 🚀 Release Highlights

Summit MVP-4 delivers the core **IntelGraph** platform, enabling organizations to secure their cognitive infrastructure. This release focuses on the foundational **Maestro Orchestration Engine**, **Identity & Access Management**, and the **Provenance Ledger**.

### 🛡️ Security & Governance (GA Supported)

*   **Secure Gateway Access:** All external traffic is secured via the `sandbox-gateway`, enforcing JWT signature verification and strict tenant isolation.
*   **Immutable Provenance:** Every critical mutation is logged to the PostgreSQL-backed Provenance Ledger with cryptographic integrity.
*   **Tenant Isolation:** Data access is strictly partitioned by Tenant ID, enforced at the API Gateway layer.
*   **Policy-as-Code:** OPA policies guard all critical resource mutations.

### ⚠️ Beta / Experimental Features (Not Supported)

The following modules are included in the codebase for **Sandbox/Preview use only** and are **NOT** covered by the GA Support or Security Guarantee:

*   **PsyOps / Humint Service:** (Beta) Advanced cognitive warfare modules.
*   **Decision API:** (Prototype) Automated decision support.
*   **Plugin Marketplace:** (Experimental) Third-party extensions.

> **Security Warning:** These Beta services must **NOT** be exposed to public networks. They utilize development authentication modes that are not suitable for production.

---

## 🔒 Security Posture

*   **Fixed:** Critical Authentication Bypass in Gateway (`AUTH-CRIT-001`).
*   **Mitigated:** Tenant Context Trust (`AUTHZ-CRIT-003`) is mitigated by strict Gateway ingress rules.
*   **Deferred Risks:** Please consult `docs/security/SECURITY_DEFERRED_RISKS.md` for a complete list of accepted risks, including internal tooling and fail-open rate limiting behavior.

---

## 📋 Changelog

### Core Platform
- [Feature] Maestro Orchestration Engine v1.0
- [Feature] Summit Web Console v1.0
- [Security] Enforced JWT validation in Sandbox Gateway
- [Security] Implemented strict CORS policies for Core API

### Infrastructure
- [Ops] Kubernetes Helm Charts v1.0
- [Ops] Prometheus/Grafana Observability Suite
- [Ops] Automated Backup & Restore scripts

---

## ✅ Upgrade & Migration

*   **New Installation:** Follow `docs/ga/DEPLOYMENT.md`.
*   **Migration:** This is the initial GA release. No migration from previous Beta versions is supported without data reset.
