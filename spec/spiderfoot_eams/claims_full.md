# Claims — EAMS

## Independent claims

1. **Method**
   1.1 Receiving a request to execute an OSINT module on a target.  
   1.2 Selecting a sandbox policy comprising an allowed egress policy specifying at least one of allowed endpoint classes, allowed methods, or maximum bytes.  
   1.3 Executing the OSINT module within a sandbox that enforces the sandbox policy while monitoring network egress events.  
   1.4 Generating an egress receipt comprising a summary of network egress events and a commitment to the summary.  
   1.5 Determining a compliance decision by evaluating the egress receipt against the sandbox policy.  
   1.6 Outputting module results together with the egress receipt and the compliance decision.

2. **System**
   A system comprising one or more processors and one or more non-transitory computer-readable media storing instructions that, when executed, cause performance of the method of claim 1.

3. **CRM**
   A non-transitory computer-readable medium storing instructions that, when executed, cause performance of the method of claim 1.

## Dependent claims

4. The method of claim 1, wherein the sandbox policy defaults to passive-only egress and blocks active probing endpoints absent an authorization token.
5. The method of claim 1, wherein the egress receipt includes destination category labels and byte counts per category.
6. The method of claim 1, further comprising halting execution when a rate limit or byte limit is exceeded and recording the halt event in the egress receipt.
7. The method of claim 1, wherein the commitment comprises a hash chain over egress events for tamper evidence.
8. The method of claim 1, wherein outputting comprises redacting module results to satisfy an egress byte budget.
9. The method of claim 1, wherein the egress receipt includes a replay token comprising a module version set and a time window.
10. The system of claim 2, further comprising a transparency log storing egress receipt digests in an append-only ledger.
11. The system of claim 2, further comprising a trusted execution environment configured to attest to sandbox enforcement, wherein the egress receipt includes an attestation quote.
12. The method of claim 1, further comprising computing a module reputation score from historical egress receipts and using the module reputation score to select the sandbox policy.
13. The method of claim 1, wherein the compliance decision includes a policy decision identifier bound to a subject context and purpose.
