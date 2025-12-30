# Pack Manifest

Defines commitments and metadata emitted with each RMEP evidence pack.

- **Fields:** scope identifier, artifact list with hashes, redaction delta hash, replay token, markings, provenance references, attestation quote (optional).
- **Integrity:** Merkle root over artifact identifiers and redaction delta; signed manifest; transparency log digest.
- **Verification:** clients verify manifest hash, optional attestation, and redaction delta applicability before ingest.
