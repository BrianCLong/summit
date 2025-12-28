# Summit Frontend Exposure Modes (MVP-3-GA)

## Purpose

Summit must present **explicit, enforced** frontend variants for sales, demo, and external-facing contexts. This specification defines **intent, enablement rules, allowed surfaces, and suppressed surfaces** for each exposure mode. These rules are enforced in code to prevent overstatement or accidental leakage of experimental features.

## Exposure Mode Definitions

| Mode                                          | Intent                                                               | Enablement                                                                                                             | Default Experiment Rule  |
| --------------------------------------------- | -------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ------------------------ |
| **Production / Customer Mode** (`production`) | Customer-facing production experience with governed surfaces.        | `VITE_EXPOSURE_MODE=production` or default when `VITE_EXPOSURE_MODE` unset and build mode is not `development`/`test`. | **Experiments blocked.** |
| **Sales Demo Mode** (`sales_demo`)            | External-facing sales demonstrations with demo-safe surfaces only.   | `VITE_EXPOSURE_MODE=sales_demo`.                                                                                       | **Experiments blocked.** |
| **Executive / Board Demo Mode** (`exec_demo`) | High-level executive overview with strictly curated surfaces.        | `VITE_EXPOSURE_MODE=exec_demo`.                                                                                        | **Experiments blocked.** |
| **Internal / Engineering Mode** (`internal`)  | Full internal access for development, QA, and engineering workflows. | `VITE_EXPOSURE_MODE=internal` or default when `import.meta.env.MODE` is `development` or `test`.                       | **Experiments allowed.** |

## Enablement Rules (No Ambiguity)

1. **Single authoritative flag**: `VITE_EXPOSURE_MODE` is the only runtime switch for exposure mode.
2. If the flag is invalid or unset:
   - `development`/`test` builds default to `internal`.
   - All other builds default to `production`.
3. Experimental features are blocked **unless** in `internal` mode.

## Demo-Safe Surface Definition

### Allowed Surfaces

Each surface is explicitly enumerated in `apps/web/src/exposure/exposureConfig.ts`.

| Surface                                                     | production | sales_demo | exec_demo | internal |
| ----------------------------------------------------------- | ---------- | ---------- | --------- | -------- |
| Home (`home`)                                               | ✅         | ✅         | ✅        | ✅       |
| Explore (`explore`)                                         | ✅         | ✅         | ❌        | ✅       |
| Alerts (`alerts`, `alert_detail`)                           | ✅         | ✅         | ❌        | ✅       |
| Cases (`cases`, `case_detail`)                              | ✅         | ✅         | ❌        | ✅       |
| Command Center (`dashboards.command_center`)                | ✅         | ✅         | ✅        | ✅       |
| Supply Chain (`dashboards.supply_chain`)                    | ✅         | ✅         | ✅        | ✅       |
| Advanced Dashboard (`dashboards.advanced`)                  | ❌         | ❌         | ❌        | ✅       |
| Internal Command (`internal.command`)                       | ❌         | ❌         | ❌        | ✅       |
| Mission Control (`mission_control`)                         | ❌         | ❌         | ❌        | ✅       |
| Data Sources (`data.sources`)                               | ✅         | ❌         | ❌        | ✅       |
| Models (`models`)                                           | ✅         | ❌         | ❌        | ✅       |
| Reports (`reports`)                                         | ✅         | ✅         | ✅        | ✅       |
| Admin (`admin`, `admin.consistency`, `admin.feature_flags`) | ❌         | ❌         | ❌        | ✅       |
| Maestro (`maestro`)                                         | ❌         | ❌         | ❌        | ✅       |
| Demo Control (`demo_control`)                               | ❌         | ❌         | ❌        | ✅       |
| Onboarding (`onboarding`)                                   | ✅         | ❌         | ❌        | ✅       |
| Help (`help`)                                               | ✅         | ✅         | ✅        | ✅       |
| Changelog (`changelog`)                                     | ✅         | ✅         | ✅        | ✅       |

### Suppressed or Modified Elements

- **Experiments:** blocked by default in all non-internal modes.
- **Forecasts, simulations, previews:** blocked by surface denial (e.g., advanced dashboards, internal command studio).
- **Internal onboarding progress:** hidden in demo modes to avoid internal operational claims.
- **Demo copy overrides:** applied for sales/exec demos to avoid real-time or speculative language.

### Copy & Label Adjustments

- **Sales Demo:**
  - Subheading: “Illustrative operational view for demonstration purposes only.”
  - Command Center description: “Operational overview dashboard.”
  - Demo notice banner: “Data is illustrative. No forecasts, autonomy, or compliance guarantees are implied.”
- **Executive Demo:**
  - Subheading: “Curated executive overview. Data shown is illustrative only.”
  - Command Center description: “Executive operations overview.”
  - Demo notice banner: “Curated, illustrative views only. No future-state claims or guarantees.”

## Enforcement Mechanisms (Code)

- **Routing guard:** `apps/web/src/components/common/ExposureGuard.tsx` blocks disallowed surfaces by redirecting to `/access-denied`.
- **Navigation filtering:** `apps/web/src/components/Navigation.tsx` hides links not permitted in the active exposure mode.
- **Feature gating:** `apps/web/src/config.ts` uses `isExperimentalFeatureAllowed` to block experimental features outside `internal`.
- **Exposure banner:** `apps/web/src/components/common/ExposureIndicator.tsx` shows clear mode-specific labeling.

## Experimental Lane Rules

- **Default:** experiments are **not demo-safe**.
- **Only allowed in `internal` mode.**
- Any experiment promoted to a demo-safe surface must be moved out of experimental gating and explicitly listed in allowed surfaces.

## Audit & Misrepresentation Defense

- Mode banners explicitly deny autonomy/guarantees and label data as illustrative.
- Surfaces that imply future state, internal controls, or compliance posture are suppressed in demo modes.
- No demo-allowed route can surface admin, feature-flag, or internal command tooling.

## Owner

Frontend Demo & Exposure Control Owner (this sprint).
