# Attestation Gate Utilities

This folder contains deploy-time tooling for the Track B supply-chain gate.

- `image_attestation_gate.py` — CLI that verifies signature, SBOM, and attestation metadata from a release manifest. Returns non-zero when any image is unsigned or unverifiable.
- `fixtures/release-manifest-pass.json` — Sample manifest that passes the gate; used as evidence for signed releases.
- `fixtures/release-manifest-blocked.json` — Manifest that demonstrates gate failure (unsigned image, missing SBOM, and invalid attestation).

Usage:

```bash
python ops/attest/image_attestation_gate.py \
  ops/attest/fixtures/release-manifest-pass.json \
  --require-sbom \
  --output runs/release-pass.json
```

Combine this with the CI CVE budget report to satisfy the "100% releases carry SBOM + attestation" SLO.
