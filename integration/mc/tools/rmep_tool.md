# MC Tool: generate_releasability_pack

- Validates policy scope and provenance; requests pack generation from IntelGraph RMEP API.
- Performs verify-first checks (attestation, manifest hash) before allowing export.
- Returns pack bundle, manifest, replay token, and transparency log proof.
