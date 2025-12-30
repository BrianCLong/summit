# Witness Ledger Service

Stores witness chains and Merkle commitments for artifacts across domains.

- Accepts witness chains from role certificates, attribution artifacts, governance reports, inversion artifacts, and shard manifests.
- Exposes APIs to verify inclusion/exclusion and to retrieve chains by replay token.
- Publishes digests to the transparency log for public auditability.
