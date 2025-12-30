# Provenance Attestation

Requirements for SLSA-style provenance attached to connectors.

- **Measurement hash:** digest of packaged code and metadata.
- **Build steps:** recorded with builder identity and source references.
- **Signer:** identity and certificate chain; verification mandatory before execution.
- **Policy binding:** contracting scope identifier and classification scope allowlist.
