# Evidence Pack: V2 Charter & Re-Opening

**Date:** 2025-10-27
**Status:** VALIDATED
**Auditor:** V2 Re-Opening Architect

## 1. Executive Summary

Summit is formally re-opened for Version 2 (V2) operations. A new Charter (`docs/v2/CHARTER.md`) has been ratified, establishing a "Dual-Mandate" to preserve V1 guarantees while authorizing bounded V2 innovation.

## 2. Deliverables Manifest

| Artifact | Location | Status |
| :--- | :--- | :--- |
| **V2 Charter** | `docs/v2/CHARTER.md` | ✅ Created |
| **Inheritance Map** | `docs/v2/INHERITED_CONTRACTS.md` | ✅ Created |
| **Change Classes** | `docs/v2/CHANGE_CLASSES.md` | ✅ Created |
| **Sandbox** | `packages/v2-sandbox/` | ✅ Created |
| **Governance Ext.** | `docs/v2/GOVERNANCE_EXTENSIONS.md` | ✅ Created |
| **Verification** | `test/verification/v2-charter.node.test.ts` | ✅ Passing |

## 3. Sandbox Boundaries

The V2 Sandbox is physically isolated in `packages/v2-sandbox/`.
*   **Access:** No production credentials.
*   **Storage:** Ephemeral/Local only.
*   **Risk:** High risk allowed internally, zero risk to core.

## 4. Verification Evidence

Automated verification confirms the structural integrity of the V2 re-opening.

```bash
$ node --test test/verification/v2-charter.node.test.ts
# TAP version 13
# ...
# ok 1 - 1. V2 Code Paths are Isolated
# ok 2 - 2. Inherited Contracts are Enforced
# ...
# pass 5
```

## 5. Next Steps

1.  Developers may begin proposing **Class A** changes in `packages/v2-sandbox/`.
2.  Governance Board to review first **Class B** proposal (if any).
3.  CI pipeline to be updated to auto-check Change Class declarations (future work).
