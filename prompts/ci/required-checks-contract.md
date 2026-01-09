# Required Checks Contract Stabilization Prompt

Mission: Stabilize required-check names so branch protection can enforce a small, GA-safe set that
does not churn as workflows evolve.

Objectives:

- Define a versioned Required Checks Contract with 6–10 stable check names.
- Refactor CI job naming to match contract check contexts.
- Add umbrella jobs for matrix checks and enforce failure propagation.
- Align branch protection policy with the contract.
- Update drift verification to validate contract, policy, workflows, and GitHub enforcement.
- Add tests for workflow parsing, policy/contract drift, and ordering determinism.

Constraints:

- Do not weaken security or compliance gates.
- Required checks must be non-skippable without explicit governance exceptions.
- Contract changes require a documented migration plan.
