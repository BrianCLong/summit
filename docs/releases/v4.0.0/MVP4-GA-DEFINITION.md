# MVP-4-GA Definition: Hardening & Enterprise Scale

**Version**: 4.0.0
**Code Name**: "Ironclad Standard"
**Status**: DRAFT

---

## 1. Executive Intent

MVP-4-GA transforms Summit/IntelGraph from a "feature-complete MVP" (v3) to a **"production-hardened Enterprise Platform"** (v4).

While v3 proved _functional capabilities_, v4 guarantees **operational determinism**. This release eliminates "happy path" engineering in favor of zero-trust architecture, automated governance, and contractual reliability.

**The Golden Rule**: If it isn't automated, enforced, and provenanced, it doesn't exist in v4.

---

## 2. Capability Delta (v3 → v4)

| Feature Area        | MVP-3-GA State            | MVP-4-GA Target State                                                                    |
| :------------------ | :------------------------ | :--------------------------------------------------------------------------------------- |
| **Server Behavior** | Correct on valid input.   | **Deterministic failure** on invalid/partial input. No "undefined" states.               |
| **Data Model**      | Neo4j constraints exist.  | **Full Semantic Enforcement**. Types match schema 1:1. Migrations are tested reversibly. |
| **Governance**      | OPA/ABAC enforcing.       | **Policy-as-Code Coverage > 95%**. Every mutation requires governance verdict.           |
| **Evidence**        | Signed bundles available. | **Chain of Custody**. Every artifact linked to a build -> commit -> requirement.         |
| **CI/CD**           | Passing tests.            | **Hard Gated**. CI blocks promotion on drift, CVEs, or coverage drops.                   |
| **Observability**   | Traces & Metrics.         | **SLO-Driven Alerts**. Errors consume error budget. Dashboards defined in code.          |

---

## 3. Contractual Reliability (The "Must-Haves")

New contractual guarantees provided to customers in v4:

1.  **Immutable Audit**: No write verification = No write. Audit logs are tamper-evident.
2.  **Zero-Downtime Schema Evolution**: All migrations are forward-compatible and reversible without outage.
3.  **Bounded Degradation**: System fails gracefully under load (Rate limits, circuit breakers active).
4.  **License-Locked Operations**: No feature execution without valid, non-expired entitlement.
5.  **Clean Dependencies**: 0 High/Critical CVEs in production container images.

---

## 4. Explicitly Out of Scope

- **Experimental Features**: "Beta" AI models or unchecked graph algorithms are disabled by default.
- **Legacy Auth Support**: Support for non-OIDC/SAML authentication is removed.
- **Ad-hoc Deployments**: Deployments bypassing the official release train are unsupported.
- **Manual Database Patches**: All DB changes must go through the migration pipeline.

---

## 5. Distinction from "Hardening Release"

This is **not** just a bug-fix sprint. It is a **capability upgrade** in the dimension of **trust**.

- Hardening = Fixing bugs.
- MVP-4-GA = **Eliminating bug classes** via architecture and policy.

We are shipping the **platform's immune system** (Governance, Evidence, CI Gates) as a primary feature.
