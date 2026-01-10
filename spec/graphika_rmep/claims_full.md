# Claims — RMEP

## Independent

1. Method: receive narrative outputs; apply scope-specific redaction/minimization; generate evidence packs per scope; produce redaction delta; generate pack manifest; emit pack and replay token.
2. System implementing the method with processors and memory.
3. CRM storing instructions to execute the method.

## Dependent

4. Packs include provenance references and timestamps.
5. Manifest uses Merkle root commitment.
6. Applies egress byte budget and max entity count per pack.
7. Sharing policy carries jurisdiction attribute with differing redaction rules.
8. Generates counterfactual pack and information-loss metric under alternate policy.
9. Replay token binds to graph snapshot ID, index version, schema version, seed.
10. Transparency log stores digest of pack manifest in append-only ledger.
11. Redaction delta allows reconstruction only when authorized.
12. TEE attests pack generation and quote is included in manifest.
13. Marking metadata compatible with NATO/DoD handling guidance.
