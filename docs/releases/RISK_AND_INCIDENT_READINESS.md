# Risk and Incident Readiness

## Governance Proving Ground
We maintain a synthetic test harness to regress-test our governance policies. This ensures that changes to risk scoring, GA gates, or tenant policies do not accidentally weaken our guardrails.

The proving ground runs a set of synthetic scenarios (e.g., "High Risk Core Graph Change") through the actual policy logic and compares the results against expected outcomes.

- **Scenarios**: `configs/governance/SCENARIOS.yaml`
- **Runner**: `scripts/governance/run_proving_ground.mjs`
- **Report**: Generated in CI via `governance-proving-ground` workflow.

To add a new policy test case, add a scenario to `SCENARIOS.yaml` and a corresponding synthetic diff JSON in `configs/governance/scenarios/`.

## Risk Assessment
[Existing content...]
