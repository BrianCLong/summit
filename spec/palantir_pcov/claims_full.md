# PCOV Full Claim Set

## Independent Claims

1. A computer-implemented method comprising:
   1.1 receiving an ontology defining object types and action types;
   1.2 receiving a policy specification defining access constraints for a subject context and a purpose;
   1.3 compiling, based on the policy specification, an ontology view comprising (i) a permitted subset of object types, (ii) a permitted subset of fields, and (iii) a permitted subset of action types;
   1.4 generating a view ABI that exposes callable interfaces corresponding to the ontology view;
   1.5 serving requests using the view ABI such that data returned by the requests is constrained to the ontology view; and
   1.6 outputting a view artifact comprising the ontology view, the view ABI, and a replay token binding the view artifact to a policy version and a schema version.

2. A system comprising one or more processors and one or more non-transitory computer-readable media storing instructions that, when executed, cause performance of the method of claim 1.

3. A non-transitory computer-readable medium storing instructions that, when executed, cause performance of the method of claim 1.

## Dependent Claims

4. The method of claim 1, wherein compiling comprises pushdown of redaction rules into the ontology view such that redacted fields are excluded or masked at materialization.
5. The method of claim 1, wherein the view ABI includes type schemas and validates request arguments against the type schemas.
6. The method of claim 1, further comprising caching the view ABI keyed by a policy scope identifier derived from the subject context and purpose.
7. The method of claim 1, wherein serving requests includes enforcing a latency budget by limiting expansions or joins permitted by the view ABI.
8. The method of claim 1, wherein the replay token further includes an index version identifier and a snapshot identifier.
9. The method of claim 1, further comprising emitting a witness record for at least one served request, the witness record committing to inputs, outputs, and a policy decision identifier.
10. The method of claim 1, further comprising supporting schema evolution by mapping a prior view ABI version to a current view ABI version using compatibility rules.
11. The method of claim 1, wherein the view artifact includes a cryptographic commitment to permitted type identifiers via a Merkle root.
12. The system of claim 2, further comprising a trusted execution environment configured to attest to compilation or serving of the view ABI.
13. The method of claim 1, wherein the subject context comprises partner tenancy attributes and the ontology view is compiled for cross-tenant federation.

## Definitions

- **Ontology view**: a policy-filtered subset of types, fields, and actions.
- **View ABI**: a versioned interface description for client consumption.
