# Experimental Flag Registry (Frontend)

**Source of truth:** `apps/web/src/experiments/registry.ts` (versioned).

| Experiment ID      | Flag Key                    | Owner                          | Review State | Lifecycle | Expires On |
| ------------------ | --------------------------- | ------------------------------ | ------------ | --------- | ---------- |
| exp-velocity-shell | exp_frontend_velocity_shell | frontend-experimental-velocity | in-review    | draft     | 2026-03-31 |
| exp-multi-pane-lab | exp_multi_pane_lab          | frontend-experimental-velocity | not-started  | draft     | 2026-03-31 |

**Emergency disable**: use the feature flag system to turn off the flag and/or set the local kill switch via `setExperimentKillSwitch`.
