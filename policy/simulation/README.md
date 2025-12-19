# Policy Simulation Harness

This harness captures curated scenarios for privileged actions so we can replay authorization decisions as the ABAC model evolves.

## Layout

- `privileged_actions.json` – JSONL-style array of simulation cases covering privileged actions and dual-control approval paths.
  Loaded as `data.privileged_actions` when running OPA locally or in CI.

## Usage

Run the policy regression suite (downloads OPA if needed) to execute the simulations alongside the unit tests:

```bash
pnpm policy:test
```

To run just the simulations with an existing OPA binary:

```bash
OPA_BIN=$(command -v opa) opa test policy/simulation policy/abac policy/tests -v
```

Each scenario describes the `input` sent to the ABAC policy and the `expect` block asserts the resulting `allow` state, reason, and obligation types.
