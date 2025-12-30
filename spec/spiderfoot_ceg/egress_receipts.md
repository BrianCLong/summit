# Egress Receipts

Receipt format for OSINT executions under Coalition Egress Guard.

- **Contents:** scope token reference, module list with versions, destination summary, byte counts, halt events, redaction summary, replay token.
- **Integrity:** hash-chained, transparency-log digests optional; Merkle root for batch exports.
- **Selective disclosure:** hashed identifiers retained; sensitive payloads removed while preserving verification hashes.
