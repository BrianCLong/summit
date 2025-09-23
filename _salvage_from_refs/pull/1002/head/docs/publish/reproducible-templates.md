# Reproducible DP Templates

Templates are bundled with deterministic build steps:
- Normalize file ordering and timestamps.
- Hash bundles using SHA-256 to derive `bundleHash`.
- Record build materials and environment IDs.
- Attach SLSA‑3 style attestation with CompositeSigner output.

Rebuilding the same source must yield identical `bundleHash` and attestation payloads.
