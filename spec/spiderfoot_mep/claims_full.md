# Claims — MEP

## Independent Claim 1 — Method

1. A computer-implemented method comprising:
   1.1 receiving OSINT scan results for one or more targets;
   1.2 deriving, from a policy specification, a plurality of sharing scopes associated with a plurality of recipients;
   1.3 partitioning the OSINT scan results into a plurality of evidence shards, each evidence shard corresponding to a sharing scope and comprising selective-disclosure content;
   1.4 generating a shard manifest comprising commitments to the plurality of evidence shards and identifiers of the sharing scopes; and
   1.5 outputting at least one evidence shard and the shard manifest with a replay token.

## Independent Claim 2 — System

2. A system comprising one or more processors and one or more non-transitory computer-readable media storing instructions that, when executed, cause performance of the method of claim 1.

## Independent Claim 3 — CRM

3. A non-transitory computer-readable medium storing instructions that, when executed, cause performance of the method of claim 1.

## Dependent Claims

4. The method of claim 1, wherein selective-disclosure content comprises at least one of aggregation, redaction, hashing of identifiers, or suppression of sensitive fields.
5. The method of claim 1, wherein partitioning comprises replacing identifiers with salted commitments unique per recipient.
6. The method of claim 1, further comprising enforcing an egress budget per evidence shard limiting bytes or entity count.
7. The method of claim 1, wherein the shard manifest is cryptographically signed and stored in an append-only transparency log.
8. The method of claim 1, wherein outputting includes a policy decision token binding a recipient identity and purpose to the evidence shard.
9. The method of claim 1, wherein the replay token comprises a module version set, a time window, and a scan configuration hash.
10. The system of claim 2, further comprising a verifier configured to verify the shard manifest and evidence shard commitments without access to unshared shards.
11. The method of claim 1, further comprising generating counterfactual partitions under an alternative policy and estimating information loss per recipient.
12. The system of claim 2, further comprising a cache keyed by scan configuration hash to reuse evidence shards.
13. The system of claim 2, further comprising a trusted execution environment configured to attest to partitioning, wherein the shard manifest includes an attestation quote.
