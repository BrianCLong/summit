# ECRM Claims (Method, System, CRM)

## Independent claims

1. Method: receive OSINT request and scope token with sharing scope and TTL; select sandbox policy; execute OSINT modules under sandbox while monitoring egress; generate selective-disclosure results and egress receipt; partition results into releasability tiers and generate tier manifest; output at least one tier with egress receipt and tier manifest.
2. System: processors and memory executing the method above.
3. Computer-readable medium: instructions to perform the method above.

## Dependent claims

4. Sandbox policy defaults to passive-only egress absent authorization token.
5. Egress receipt includes destination class labels and byte counts per class.
6. Halt execution upon violation of an egress budget and record the halt in the egress receipt.
7. Tier manifest includes cryptographic commitments to tier contents via a Merkle root.
8. Scope token is signed and binds performer identity and purpose.
9. Counterfactual run under a stricter tier policy outputs an information-loss metric.
10. System includes a transparency log storing digests of tier manifests.
11. System caches validated scope tokens for the time-to-live.
12. System includes a trusted execution environment configured to attest to sandbox enforcement.
13. Tiering metadata is compatible with multi-performer evaluator workflows and deliverable packaging.
