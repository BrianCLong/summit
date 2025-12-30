# Claims — CEG

## Independent

1. Method: receive OSINT request with classification scope; validate scope token; select egress policy; execute modules under policy while monitoring egress; generate egress receipt; output selective-disclosure results and receipt with replay token.
2. System implementing the method.
3. CRM storing instructions for the method.

## Dependent

4. Classification scope includes CUI constraints aligned to NIST SP 800-171.
5. Egress policy defaults to passive-only and blocks active probing absent authorization token.
6. Selective-disclosure results enforce egress byte budget and redact identifiers while preserving hashes.
7. Egress receipt is hash chained for tamper evidence.
8. Replay token includes module versions and time window.
9. Execution halts when egress threshold exceeded and halt recorded in receipt.
10. Transparency log stores digests of egress receipts in append-only ledger.
11. Trusted execution environment attests enforcement and quote included.
12. Counterfactual execution under stricter policy with information-loss report.
13. Classification scope token supports NATO Restricted handling metadata.
