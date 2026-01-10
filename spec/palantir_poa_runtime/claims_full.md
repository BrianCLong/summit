# Claims — POAR

## Independent claims

1. **Method**
   1.1 Receiving an action specification defining an action to be executed over a dataset.  
   1.2 Compiling the action specification into an execution plan and a set of proof obligations, the set of proof obligations comprising at least a policy obligation and a disclosure obligation.  
   1.3 Verifying, prior to execution, satisfiability of the set of proof obligations for a subject context and a purpose.  
   1.4 Executing the execution plan to obtain an output.  
   1.5 Transforming the output to satisfy the disclosure obligation.  
   1.6 Generating a proof object committing to the execution plan, a policy decision identifier, and the transformed output.  
   1.7 Outputting the transformed output and the proof object.

2. **System**
   A system comprising one or more processors and one or more non-transitory computer-readable media storing instructions that, when executed, cause performance of the method of claim 1.

3. **CRM**
   A non-transitory computer-readable medium storing instructions that, when executed, cause performance of the method of claim 1.

## Dependent claims

4. The method of claim 1, wherein the disclosure obligation comprises a constraint selected from k-anonymity, suppression, aggregation, or egress byte limits.
5. The method of claim 1, wherein verifying satisfiability comprises statically verifying that the execution plan contains no operation with an EXPORT effect absent an authorization token.
6. The method of claim 1, wherein the proof object includes a determinism token comprising a snapshot identifier and a seed value.
7. The method of claim 1, wherein generating the proof object comprises cryptographically signing the proof object and storing it in an append-only transparency log.
8. The method of claim 1, further comprising generating a counterfactual proof object for an alternative disclosure obligation and outputting an information loss metric.
9. The method of claim 1, wherein the proof obligations further comprise an invariant obligation constraining changes to a set of graph edges.
10. The system of claim 2, further comprising a proof verifier configured to verify the proof object without re-executing the execution plan.
11. The method of claim 1, wherein the execution plan is executed within a sandbox enforcing maximum runtime and memory.
12. The system of claim 2, further comprising a trusted execution environment configured to attest to execution, wherein the proof object includes an attestation quote.
13. The method of claim 1, further comprising caching compiled execution plans keyed by an action signature and a policy version.
