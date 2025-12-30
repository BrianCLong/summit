# Releasability Packs

Tiered export artifacts that encapsulate releasability policies, redaction rules, and audit evidence for coalition sharing.

- **Scopes:** US-only, Coalition, Partner; jurisdiction attribute drives redaction differences.
- **Contents per pack:** payload artifacts, marking metadata, redaction delta pointer, replay token, provenance references.
- **Pack manifest:** Merkle-root commitment to included artifacts and redaction delta; optionally includes TEE attestation quote.
- **Redaction delta:** reversible transformation description allowing reconstruction of less-restricted packs only when authorized.
- **Egress control:** byte budget and entity-count limits enforced per pack.
- **Transparency:** digest stored in append-only transparency log; release events recorded for audit.

Produced by RMEP (Graphika wedge) and consumed by export UI and verification services.
