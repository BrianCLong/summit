# Replay Tokens

Replay tokens bind exported artifacts to deterministic inputs for reproducibility and audit.

- **Binding set:** policy revision, schema version, time window, data snapshot identifiers, seed values, module versions.
- **Purpose:** enable regeneration of evidence packs, incident packets, and assessment artifacts; referenced in manifests.
- **Security:** signed and logged; optionally TEE-attested.
