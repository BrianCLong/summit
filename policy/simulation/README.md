# Policy simulation harness

This directory contains curated simulation scenarios for privileged actions that rely on dual control. The JSON data feeds both regression tests and ad-hoc simulations to validate that policy changes preserve guardrails for high-risk operations.

## Files

- `privileged_actions.json` – golden scenarios covering dual-control and step-up combinations for privileged dataset actions.
- `privileged_actions_test.rego` – OPA tests that replay the scenarios against `summit.abac` decisions.

## Running locally

```bash
pnpm policy:test
```

The `policy:test` script will fetch an `opa` binary if needed and execute all Rego tests (including these simulations) under the `policy/` directory.
