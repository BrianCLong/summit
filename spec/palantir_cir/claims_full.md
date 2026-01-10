# Claims — CIR

## Independent

1. Method: monitor security events; detect incident via policy; initiate preservation; generate incident packet with timeline/assets/commitment; output packet with checklist and replay token.
2. System implementing the method.
3. CRM storing instructions for the method.

## Dependent

4. Policy configurable to match DFARS 252.204-7012 reporting expectations.
5. Preservation includes tamper-evident witness chain.
6. Packet includes access-certificate requirement metadata for reporting workflows.
7. Checklist includes fields for covered defense information determination.
8. Generates counterfactual incident classification under alternate policy with difference explanation.
9. Replay token binds to SIEM index versions and time window.
10. Transparency log stores digest of incident packet.
11. Output enforces redaction while preserving verification hashes.
12. Trusted execution environment attests packet generation.
13. Packet exports contract clause mapping section referencing applicable DFARS clauses.
