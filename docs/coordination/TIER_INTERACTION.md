# Tier-Aware Coordination

## 1. Tier Sensitivity

*   **Tier 0 (No Autonomy)**: Actions are advisory only. The coordination layer logs them but they do not automatically execute (simulated in current implementation).
*   **Tier 1-2**: Subject to strict coordination and arbitration.
*   **Tier 3+**: Requires higher-level stability checks.

## 2. Auto-Demotion

(Planned) Repeated coordination failures or stability violations will trigger a downgrade in the autonomy tier for the offending loop.
