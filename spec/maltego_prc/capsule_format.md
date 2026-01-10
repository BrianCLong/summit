# PRC Capsule Format

## Required components

- Interface contract with effect types (READ, WRITE, EXPORT).
- Execution harness with seeded determinism and replay manifest.
- Witness chain committing to inputs and outputs.
- Rate-limit and egress budgets enforced during execution.

## Optional components

- Peer-review package containing intermediate artifacts and minimal datasets.
- Counterfactual execution profile under stricter disclosure rules with information-loss report.
