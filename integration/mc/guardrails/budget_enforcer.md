# Budget Enforcer

Ensures runtime, evidence, and explanation budgets are enforced uniformly.

## Policies
- IPIO: computation and explanation budgets; fail fast if exceeded.
- IDCP: proof budget for support sets and verification time.
- OMCP: verification and migration runtime budgets.
- TCGI: rate-limit and cost budgets per endpoint.
- LLCT: hop and egress budgets tied to correlation tokens.

## Telemetry
- Emit budget usage metrics to observability stack and record in receipt ledger for audit.
