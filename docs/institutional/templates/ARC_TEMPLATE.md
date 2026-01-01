# Annual Re-Certification Cycle (ARC)

**Year:** [YYYY]
**Owner:** [Name]
**Status:** [Pending | Certified | Revoked]

---

## 1. Directive
*ARC removes power more often than it grants it. Nothing is trusted because it exists.*

## 2. Autonomy Tier Re-Certification

| Capability | Current Tier | Justification for Retention | Risk History (Last 12m) | Decision |
| :--- | :--- | :--- | :--- | :--- |
| **Optimization (Cost)** | [e.g., Tier 2] | [Why do we still need this?] | [Incidents?] | [Retain/Demote/Revoke] |
| **Optimization (Perf)** | [e.g., Tier 1] | ... | ... | ... |
| **Strategic Autonomy** | [e.g., Tier 0] | ... | ... | ... |

*Action Required: Downgrade any capability that cannot justify its current tier.*

---

## 3. Trust Boundary Review
*Re-verify all external connections and permissions.*

*   [ ] **API Access:** All tokens rotated and scopes minimized?
*   [ ] **Data Egress:** All export paths still required?
*   [ ] **Vendor/Partner Access:** All 3rd party access still under contract?

---

## 4. Strategic Assumption Test
*Are the core beliefs driving the system still true?*

1.  **Assumption:** [e.g., "Cloud provider X is cost-optimal"]
    *   *Validity Check:* [True/False]
    *   *Action:* [Keep/Update]

2.  **Assumption:** [e.g., "Model Y provides sufficient safety"]
    *   *Validity Check:* [True/False]
    *   *Action:* [Keep/Update]

---

## 5. Deprecation & Removal List
*What are we turning off? (Must be > 0 items)*

1.  [Item to remove]
2.  [Item to remove]

---

## 6. Certification

**We certify that the system is safe to operate for another 12 months under these constraints.**

| Role | Name | Signature | Date |
| :--- | :--- | :--- | :--- |
| **Platform Owner** | | | |
| **Security Officer** | | | |
| **Chief Auditor** | | | |

*If signatures are missing, the system must be shut down or reverted to Tier 0.*
