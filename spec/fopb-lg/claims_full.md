# Federated OSINT with Privacy Budgets and Legal Gates (FOPB-LG) — Claims

## Independent Claims

1. **Method.** A computer-implemented method comprising:
   1. receiving a scan request that identifies one or more targets and a scan purpose;
   2. determining a scan mode comprising a passive mode and an active mode, wherein the active mode is permitted only upon validating an authorization token;
   3. selecting a subset of OSINT modules from a module registry based on a policy constraint and at least one of a legal constraint or a terms-of-service constraint;
   4. enforcing a privacy budget associated with at least one target of the one or more targets, the privacy budget limiting at least one of a number of lookups, data egress bytes, or retention time;
   5. executing the selected subset of OSINT modules under one or more rate limits to obtain scan results;
   6. generating a scan ledger comprising module identifiers, target commitments, and redacted scan results; and
   7. outputting a scan capsule comprising the scan ledger and a replay token.

2. **System.** A system comprising: one or more processors; a module registry configured to store OSINT modules with associated legal metadata and policy metadata; a privacy budget manager configured to enforce the privacy budget; a rate limiter configured to enforce the one or more rate limits; a capsule generator configured to generate the scan capsule comprising the scan ledger; and a graph materializer configured to ingest the scan capsule into a graph store with provenance annotations.

3. **Computer-readable medium.** A non-transitory computer-readable medium storing instructions that, when executed, cause performance of the method of claim 1.

## Dependent Claims

4. The method of claim 1, wherein the target commitments comprise salted hashes unique per tenant to prevent cross-tenant correlation.
5. The method of claim 1, wherein selecting the subset of OSINT modules comprises applying a jurisdiction rule set based on a geolocation associated with the at least one target.
6. The method of claim 1, further comprising assigning a risk score to each OSINT module and rejecting execution of an OSINT module having a risk score above a threshold absent elevated authorization.
7. The method of claim 1, wherein enforcing the privacy budget comprises decrementing the privacy budget according to a cost function based on returned bytes and a sensitivity classification.
8. The system of claim 2, wherein the capsule generator cryptographically signs the scan capsule and stores the scan capsule or a digest thereof in an append-only transparency log.
9. The method of claim 1, wherein the scan capsule includes a witness chain that includes, for each executed OSINT module, a witness record binding inputs, outputs, and a policy decision identifier.
10. The method of claim 1, further comprising generating a counterfactual scan plan that omits at least one OSINT module and estimating a loss of information gain relative to the scan request.
11. The method of claim 1, wherein enforcing the retention time comprises automatically deleting stored scan results after expiration of a time-to-live.
12. The system of claim 2, wherein the rate limiter enforces both a per-module concurrency constraint and a per-target concurrency constraint.
13. The method of claim 1, wherein the scan ledger includes a compliance rationale indicating why each OSINT module was selected under the legal constraint and the terms-of-service constraint.
14. The method of claim 1, wherein determining the scan mode comprises defaulting to the passive mode when the authorization token is absent.
