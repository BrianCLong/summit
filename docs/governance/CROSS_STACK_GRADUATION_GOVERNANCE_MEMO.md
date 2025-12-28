# Cross-Stack Graduation Governance Memo

**Subject:** Unified Graduation Model for Summit (Frontend + Backend)

Summit now operates under a single, organization-wide graduation model. Frontend and backend
changes **must** graduate together. This removes split-maturity risk and ensures every capability is
backed by aligned evidence and aligned contracts.

## How Graduation Works

- **One lifecycle**: Experimental → GA-Adjacent → GA.
- **One decision**: Promotion is a **joint** decision with shared gates and shared evidence.
- **One approval**: Frontend and backend DRIs co-approve, with the Cross-Stack Graduation Systems
  Owner as the final arbiter.

## How Split-Maturity Risk Is Eliminated

- CI blocks mismatched lifecycle declarations between frontend and backend.
- Promotion cannot proceed without a shared evidence bundle.
- Any conflict defaults to the **least mature** state.

## Why This Preserves Trust and Enables Velocity

- **Trust**: Claims and maturity are consistent across the stack. No UI can look GA without backend
  readiness, and no backend can claim GA without UI parity.
- **Velocity**: Teams move faster with a single checklist, single evidence bundle, and clear
  promotion gates. No re-litigation per team.

This governance keeps Summit honest: **nothing looks more mature than it is**.
