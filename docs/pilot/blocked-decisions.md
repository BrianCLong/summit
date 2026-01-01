# Blocked Decisions Log (Phase 3)

**Status:** Active Tracking
**Phase:** Soft Gating (Days 31–60)

## Purpose
This log tracks every instance where Summit intervened to stop or pause an action.

## Log

| Date | Decision ID | Action Attempted | Summit Outcome | Reason | Override? | Outcome |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 202X-MM-DD | DEC-001 | Block Subnet 10.0.0.0/24 | **REFUSED** | "Target is Critical Infra (Production DBs). High Collateral Damage Risk." | No | Operator aborted action. **Saved potential outage.** |
| 202X-MM-DD | DEC-002 | Reset Password (VIP) | **INSUFFICIENT_EVIDENCE** | "Missing ID verification step in ticket." | Yes | Operator overrode: "CEO on phone." (Valid) |
| 202X-MM-DD | DEC-003 | Deploy Firewall Rule | **REFUSED** | "Change Freeze Window Active." | No | Deployment queued for Monday. |
| ... | ... | ... | ... | ... | ... | ... |

## Override Analysis
* **Total Interventions:** [N]
* **Overrides:** [M] ([M/N]%)
* **Valid Overrides:** [Count] (System needs tuning)
* **Invalid Overrides:** [Count] (Policy enforcement needed)

## High-Value Saves
* **Incident DEC-001:** Prevented blocking of Production Database subnet. Estimated downtime avoided: 2 hours. Cost savings: $50k.
