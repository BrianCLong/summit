# FOPB-LG Claims (Draft)

## Independent Claims

1. **Method**: A computer-implemented method comprising:
   1. receiving a scan request identifying one or more targets and a scan purpose;
   2. determining a scan mode including a passive mode and an active mode, wherein the active
      mode is permitted only upon validating an authorization token;
   3. selecting a subset of OSINT modules from a module registry based on at least one of a legal
      constraint, terms-of-service constraint, or policy constraint;
   4. enforcing a privacy budget associated with the targets that limits at least one of a
      number of lookups, data egress bytes, or retention time;
   5. executing the selected subset of OSINT modules under rate limits to obtain scan results;
   6. generating a scan ledger comprising module identifiers, commitments to target identifiers,
      and redacted scan results; and
   7. outputting a scan capsule comprising the scan ledger and a replay token.

2. **System**: A system comprising:
   1. a module registry configured to store OSINT modules with associated legal and policy
      metadata;
   2. a privacy budget manager configured to enforce privacy budgets;
   3. a rate limiter configured to enforce rate limits per module;
   4. a capsule generator configured to generate the scan capsule including the scan ledger; and
   5. a graph materializer configured to ingest the scan capsule into a graph store with
      provenance annotations.

## Dependent Claims

3. The method of claim 1, wherein commitments to target identifiers comprise salted hashes unique
   per tenant to prevent cross-tenant correlation.
4. The method of claim 1, wherein selecting the subset of OSINT modules comprises applying a
   jurisdiction rule set based on target geolocation.
5. The method of claim 1, further comprising assigning a risk score to each OSINT module and
   rejecting execution of modules exceeding a risk threshold absent elevated authorization.
6. The method of claim 1, wherein enforcing the privacy budget includes decrementing the budget
   based on a cost function over returned bytes and sensitivity classification.
7. The system of claim 2, wherein the capsule generator cryptographically signs the scan capsule
   and stores it in an append-only transparency log.
8. The method of claim 1, wherein the scan capsule includes a witness chain per executed module
   binding inputs, outputs, and policy decisions.
9. The method of claim 1, further comprising generating counterfactual scan plans that omit one
   or more modules and estimating information gain loss.
10. The method of claim 1, wherein retention time limits are enforced by automatically deleting
    stored scan results after a time-to-live.
11. The system of claim 2, wherein the rate limiter enforces both per-module and per-target
    concurrency constraints.
12. The method of claim 1, wherein the scan ledger includes a compliance rationale indicating
    why each module was selected under the legal and policy constraints.
13. The system of claim 2, further comprising storing budget usage metrics in an audit ledger.
