# OAEAC Claims (Draft)

## Independent Claims

1. **Method**: A computer-implemented method comprising:
   1. receiving an ontology defining object types and action types;
   2. generating an application binary interface (ABI) comprising callable interfaces for
      reading and writing instances of the object types and for invoking the action types;
   3. associating with at least one action type an action contract comprising preconditions,
      postconditions, and an effect signature indicating one or more of read, write, or export;
   4. upon receiving a request to execute an action instance, verifying the preconditions and
      authorizing the effect signature using a policy engine;
   5. applying a state change to a graph store responsive to executing the action instance;
   6. verifying the postconditions; and
   7. generating a witness record committing to the state change and the authorization, and
      outputting an execution artifact including the witness record.

2. **System**: A system comprising:
   1. an ABI generator configured to generate the ABI from the ontology;
   2. a contract verifier configured to verify preconditions and postconditions;
   3. a policy gateway configured to authorize the effect signature;
   4. a graph store configured to apply the state change; and
   5. a witness ledger configured to store the witness record.

## Dependent Claims

3. The method of claim 1, wherein the ABI includes typed schemas for object fields and validates
   action arguments against the typed schemas.
4. The method of claim 1, wherein the witness record includes commitments to inputs and outputs
   using hash commitments and includes a policy decision identifier.
5. The method of claim 1, further comprising generating a counterfactual branch by simulating the
   action instance without applying the state change, and outputting a simulation artifact.
6. The method of claim 1, wherein authorizing the effect signature comprises enforcing
   purpose-based access control and data egress constraints.
7. The method of claim 1, wherein applying the state change comprises writing a delta to an
   append-only delta log and deriving a new snapshot identifier.
8. The system of claim 2, further comprising an optimizer configured to reorder or fuse action
   steps while preserving contract satisfaction.
9. The system of claim 2, wherein the witness ledger is tamper-evident via hash chaining of
   witness records.
10. The method of claim 1, wherein the execution artifact includes a determinism token enabling
    replay of action execution on the graph store.
11. The method of claim 1, wherein the ABI generator emits client stubs for orchestration tools
    and audit user interfaces.
12. The system of claim 2, further comprising a trusted execution environment configured to
    attest to execution of the contract verifier and policy gateway.
13. The method of claim 1, further comprising writing policy decision logs to a compliance ledger
    and associating them with the witness record.
