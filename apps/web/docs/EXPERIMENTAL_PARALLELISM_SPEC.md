# Experimental Parallelism Specification (Frontend)

## Purpose

Enable multiple concurrent frontend experiments with predictable risk, fast feedback, and zero GA contamination.

## Parallelism Model

- **Maximum global experiments**: 6 active at once.
- **Maximum per owner**: 2 active at once.
- **Lifecycle clocks**: every experiment has `startsOn` + `expiresOn` in the registry.
- **Review state**: every experiment has an explicit review state (`not-started`, `in-review`, `approved`, `rejected`).

## Isolation Requirements

### Code

- Each experiment lives in its own directory: `apps/web/src/experiments/<experiment-id>/`.
- GA modules must **not** import from experiments. Experiments can import GA utilities but not mutate GA state.
- No shared mutable state across experiments.

### UX

- All experiment UI must render within `ExperimentalGate`.
- `ExperimentalBanner` is required for uniform “Experimental / Preview” affordances.
- No default navigation exposure. Access only via explicit deep links or test routes.

### Data & Semantics

- **Read-only** access. No mutations to GA data.
- No reuse of GA metrics; experiments log to `exp.*` events only.
- No claim elevation or GA labeling in UI.

## Conflict Prevention

- Flags are isolated per experiment (`flagKey` is unique).
- A single experiment cannot ship without a registry entry (owner + expiration).
- Conflicts are prevented by directory isolation and registry validation.

## Operational Workflow

1. Create experiment directory and register it in `registry.ts`.
2. Add a flag in the feature flag system matching `flagKey`.
3. Render UI behind `ExperimentalGate` and keep it read-only.
4. Instrument with `exp.*` events only.
5. Expire or kill experiments on the defined date or trigger conditions.

## Kill Criteria

- **Automatic**: high error rate, performance regression, or user confusion reports.
- **Manual**: on-call or experiment owner invokes kill switch.
- **Rollback**: disable flag and remove the experiment route.
- **Post-mortem**: required for killed experiments; publish learnings.
