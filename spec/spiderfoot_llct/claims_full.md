# Claims — LLCT

## Independent Claim 1 — Method
1. A computer-implemented method comprising:
   1. receiving an OSINT execution request associated with a target identifier;
   2. issuing or validating a linkage-limited correlation token that specifies a correlation scope comprising at least one of permitted identifier types, a maximum hop count for linking, a time-to-live, or an egress limit;
   3. executing at least one OSINT module to obtain module outputs comprising identifiers;
   4. enforcing the correlation scope by restricting creation of links between identifiers in a graph store based on the linkage-limited correlation token;
   5. generating a linkage receipt committing to identifiers linked and the linkage-limited correlation token; and
   6. outputting selective results and the linkage receipt.

## Independent Claim 2 — System
2. A system comprising one or more processors and one or more non-transitory computer-readable media storing instructions that, when executed, cause performance of the method of claim 1.

## Independent Claim 3 — Computer-Readable Medium
3. A non-transitory computer-readable medium storing instructions that, when executed, cause performance of the method of claim 1.

## Dependent Claims
4. The method of claim 1, wherein validating the linkage-limited correlation token comprises verifying a signature binding the token to a tenant and a purpose.
5. The method of claim 1, wherein enforcing the correlation scope comprises blocking link creation when the maximum hop count is exceeded.
6. The method of claim 1, wherein the correlation scope comprises an allowed identifier type set and identifiers outside the allowed identifier type set are stored only as redacted or hashed indicators.
7. The method of claim 1, wherein the linkage receipt is stored in an append-only ledger and is hash chained for tamper evidence.
8. The method of claim 1, wherein outputting selective results comprises enforcing an egress byte budget and redacting module outputs.
9. The method of claim 1, further comprising generating a counterfactual token with a smaller scope and estimating information loss.
10. The method of claim 1, wherein the linkage-limited correlation token includes a replay token comprising module versions and a time window.
11. The system of claim 2, further comprising a cache that caches validated tokens and associated policy decisions for a token TTL.
12. The system of claim 2, further comprising a trusted execution environment configured to attest to token enforcement, wherein the linkage receipt includes an attestation quote.
13. The method of claim 1, wherein the correlation scope includes a jurisdiction attribute and enforcing comprises applying jurisdiction-specific rules.
