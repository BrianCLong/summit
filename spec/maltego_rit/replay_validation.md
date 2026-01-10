# Replay Validation

RIT validates inversion artifacts by re-running the candidate subplan.

## Steps

- Execute the subplan with minimal inputs.
- Compare generated outputs against target result set.
- Record deterministic replay token and witness chain.
