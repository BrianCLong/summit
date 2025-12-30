# Egress & Disclosure Receipts

Audit artifacts summarizing outbound requests and disclosures governed by scope tokens.

- **Fields:** scope token reference, destinations, byte counts, module IDs, policy version, halt reasons, redaction applied.
- **Integrity:** hash-chained receipts, Merkle-root commitment for batch exports.
- **Selective disclosure:** preserves hashed identifiers and signatures while removing sensitive payloads.
- **Counters:** egress threshold enforcement with recorded halts and violations.
- **Usage:** produced by Coalition Egress Guard and Tool Assurance dashboards; stored in transparency log for audit.
