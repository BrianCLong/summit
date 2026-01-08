# Annual Re-Certification Cycle (ARC)

**Year:** [YYYY]
**Owner:** [Name]
**Status:** [Pending | Certified | Revoked]

---

## 1. Directive

_ARC removes power more often than it grants it. Nothing is trusted because it exists._

## 2. Autonomy Tier Re-Certification

| Capability              | Current Tier   | Justification for Retention  | Risk History (Last 12m) | Decision               |
| :---------------------- | :------------- | :--------------------------- | :---------------------- | :--------------------- |
| **Optimization (Cost)** | [e.g., Tier 2] | [Why do we still need this?] | [Incidents?]            | [Retain/Demote/Revoke] |
| **Optimization (Perf)** | [e.g., Tier 1] | ...                          | ...                     | ...                    |
| **Strategic Autonomy**  | [e.g., Tier 0] | ...                          | ...                     | ...                    |

_Action Required: Downgrade any capability that cannot justify its current tier._

---

## 3. Trust Boundary Review

_Re-verify all external connections and permissions._

- [ ] **API Access:** All tokens rotated and scopes minimized?
- [ ] **Data Egress:** All export paths still required?
- [ ] **Vendor/Partner Access:** All 3rd party access still under contract?

---

## 4. Strategic Assumption Test

_Are the core beliefs driving the system still true?_

1.  **Assumption:** [e.g., "Cloud provider X is cost-optimal"]
    - _Validity Check:_ [True/False]
    - _Action:_ [Keep/Update]

2.  **Assumption:** [e.g., "Model Y provides sufficient safety"]
    - _Validity Check:_ [True/False]
    - _Action:_ [Keep/Update]

---

## 5. Deprecation & Removal List

_What are we turning off? (Must be > 0 items)_

1.  [Item to remove]
2.  [Item to remove]

---

## 6. Certification

**We certify that the system is safe to operate for another 12 months under these constraints.**

| Role                 | Name | Signature | Date |
| :------------------- | :--- | :-------- | :--- |
| **Platform Owner**   |      |           |      |
| **Security Officer** |      |           |      |
| **Chief Auditor**    |      |           |      |

_If signatures are missing, the system must be shut down or reverted to Tier 0._
