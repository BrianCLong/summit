# Claims – FOPB-LG

## Independent Claims

1. **Method:** Receive scan request with targets and purpose; determine passive vs. active mode with authorization gating for active; select OSINT modules based on legal/ToS/policy constraints; enforce privacy budget (lookups/egress/retention); execute modules under rate limits; generate scan ledger with module IDs, target commitments, redacted results; output scan capsule with ledger and replay token.
2. **System:** Module registry with legal/policy metadata, privacy budget manager, rate limiter, capsule generator producing scan capsule with ledger, and graph materializer ingesting capsule with provenance.

## Dependent Variations

3. Target commitments are salted hashes unique per tenant to prevent correlation.
4. Module selection applies jurisdiction rule set using target geolocation.
5. Risk score per module; reject above-threshold modules without elevated authorization.
6. Privacy budget decremented by cost function over returned bytes and sensitivity.
7. Capsule generator signs scan capsule and stores in append-only transparency log.
8. Witness chain per module with inputs/outputs and policy decision identifiers.
9. Counterfactual scan plans omitting modules with estimated information gain loss.
10. Retention limits enforced via automatic TTL deletion of stored results.
11. Rate limiter enforces per-module and per-target concurrency constraints.
12. Scan ledger includes compliance rationale for module selection.
