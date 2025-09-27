Policy Pack Signing (starter)

- Generate digest: sha256 over tar of `opa/` + `data/` + `manifest.json`.
- Sign: `cosign sign-blob --bundle signing/cosign.bundle.json policy-pack.tgz`.
- Verify: `cosign verify-blob --bundle signing/cosign.bundle.json --signature <sig> policy-pack.tgz`.

Note: This starter provides a bundle path placeholder; wire actual CI later.

