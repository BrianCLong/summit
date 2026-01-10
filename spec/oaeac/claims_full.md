# Ontology ABI and Enforced Action Contracts (OAEAC) — Claims

## Independent Claims

1. **Method.** A computer-implemented method comprising:
   1. receiving an ontology defining a set of object types and a set of action types;
   2. generating an application binary interface (ABI) that includes at least (i) a read interface for reading an object instance of an object type and (ii) a write interface for applying a patch to an object instance;
   3. for a selected action type of the set of action types, generating an action contract comprising (i) a precondition predicate, (ii) a postcondition predicate, and (iii) an effect signature indicating at least one of READ, WRITE, or EXPORT;
   4. receiving an action execution request specifying an action instance corresponding to the selected action type;
   5. verifying satisfaction of the precondition predicate using a current graph state;
   6. authorizing the effect signature for the action instance using a policy engine;
   7. applying a state change to a graph store to obtain an updated graph state;
   8. verifying satisfaction of the postcondition predicate using the updated graph state; and
   9. generating and storing a witness record committing to at least the state change and an authorization decision, and outputting an execution artifact that includes the witness record.

2. **System.** A system comprising: one or more processors; a graph store configured to store a graph state; an ABI generator configured to generate the ABI from the ontology; a contract verifier configured to verify the precondition predicate and the postcondition predicate; a policy gateway configured to authorize the effect signature; and a witness ledger configured to store the witness record.

3. **Computer-readable medium.** A non-transitory computer-readable medium storing instructions that, when executed, cause performance of the method of claim 1.

## Dependent Claims

4. The method of claim 1, wherein generating the ABI comprises generating typed schemas for object fields and validating action arguments against the typed schemas.
5. The method of claim 1, wherein the witness record includes a hash commitment to action inputs and a hash commitment to action outputs, and a policy decision identifier.
6. The method of claim 1, further comprising generating a counterfactual simulation artifact by simulating the state change without applying the state change to the graph store.
7. The method of claim 1, wherein applying the state change comprises writing a delta to an append-only delta log and deriving a new snapshot identifier from the delta.
8. The system of claim 2, wherein the witness ledger is tamper-evident by hash chaining witness records.
9. The method of claim 1, wherein authorizing the effect signature comprises enforcing purpose-based access control and data egress constraints.
10. The method of claim 1, wherein the execution artifact includes a determinism token comprising at least a snapshot identifier and a seed value.
11. The system of claim 2, further comprising an optimizer configured to reorder or fuse action steps while preserving satisfaction of the action contract.
12. The system of claim 2, further comprising a trusted execution environment configured to generate an attestation quote bound to a digest of the witness record.
13. The method of claim 1, wherein the effect signature comprises an EXPORT effect and authorizing comprises validating an export authorization token.
14. The method of claim 1, wherein verifying satisfaction of the postcondition predicate comprises verifying an invariant on a set of edges affected by the action instance.
