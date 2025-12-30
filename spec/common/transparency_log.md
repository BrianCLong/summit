# Transparency Log

Append-only ledger for recording digests of manifests, receipts, and assurance reports.

- **Structure:** hash-chained entries with signer identity, timestamp, artifact type, digest, replay token reference.
- **Access:** queryable for verification; supports inclusion proofs for Merkle-tree backed batches.
- **Scope:** logs releasability pack manifests, incident packet digests, egress receipts, and assurance reports.
- **Governance:** retention aligned to DFARS 7012 preservation timelines and NATO coalition auditability expectations.
