Policy Pack v0

Contents
- OPA policies under `opa/` (e.g., `cos.abac.rego`).
- Data defaults under `data/` (retention tiers, purpose tags).
- `manifest.json` contains the pack digest and signature metadata.
- `signing/cosign.bundle.json` is written by CI after signing.

Build
- Use CI or locally: `bash scripts/build_policy_pack.sh` then `bash scripts/cosign_sign.sh`.
- The built tar is at `dist/policy-pack/v0/policy-pack-v0.tar`.

