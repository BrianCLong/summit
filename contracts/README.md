Policy Pack v0 (starter)

Contents
- OPA: `v0/opa/cos.abac.rego` with basic tenant/env/purpose checks.
- Data: retention tiers and purpose tags.
- Manifest: `v0/manifest.json` including digest and signature placeholders.

Usage
- Package: tar `v0/` into `policy-pack.tgz` in CI.
- Digest: update `manifest.json.digest.value` with sha256 of tar.
- Sign: produce cosign bundle at `v0/signing/cosign.bundle.json`.
- Serve: MC exposes `GET /v1/policy/packs/policy-pack-v0`.

