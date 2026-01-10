# SDOC Full Claim Set

## Independent Claims

1. A computer-implemented method comprising:
   1.1 receiving a scan request identifying one or more targets and a purpose;
   1.2 selecting, from a module registry, a set of OSINT modules based on at least one of a policy constraint, a legal constraint, or a sensitivity constraint;
   1.3 enforcing a sensitivity budget associated with at least one target, the sensitivity budget limiting at least one of returned bytes, sensitivity class, or retention time;
   1.4 executing the set of OSINT modules under rate limits to obtain raw scan results;
   1.5 generating selective-disclosure scan results by applying aggregation or redaction to the raw scan results in accordance with the sensitivity budget;
   1.6 generating a capsule ledger comprising module identifiers and commitments to the selective-disclosure scan results; and
   1.7 outputting a selective-disclosure capsule comprising the capsule ledger and a replay token.

2. A system comprising one or more processors and one or more non-transitory computer-readable media storing instructions that, when executed, cause performance of the method of claim 1.

3. A non-transitory computer-readable medium storing instructions that, when executed, cause performance of the method of claim 1.

## Dependent Claims

4. The method of claim 1, wherein selecting comprises defaulting to passive-only modules absent an authorization token for active probing.
5. The method of claim 1, wherein enforcing the sensitivity budget comprises decrementing the budget based on a cost function that weights bytes by sensitivity class.
6. The method of claim 1, wherein aggregation comprises producing counts, ranges, or hashed indicators instead of raw identifiers for at least one result type.
7. The method of claim 1, further comprising storing the selective-disclosure capsule or a digest thereof in an append-only transparency log.
8. The method of claim 1, wherein the replay token comprises a module-version set and a time window.
9. The method of claim 1, further comprising generating counterfactual capsule outputs for alternative module sets and estimating information gain loss.
10. The system of claim 2, further comprising a retention enforcer configured to delete stored scan artifacts upon expiration of a time-to-live.
11. The method of claim 1, wherein the capsule ledger includes a compliance rationale indicating why each module was selected.
12. The system of claim 2, further comprising a witness chain that includes, per module execution, a witness record committing to inputs, outputs, and a policy decision identifier.
13. The system of claim 2, further comprising a trusted execution environment configured to attest to execution of at least one OSINT module.

## Definitions

- **Selective-disclosure capsule**: a bounded OSINT output with explicit
  aggregation/redaction and replay metadata.
- **Sensitivity budget**: policy-defined constraints on outputs and retention.
