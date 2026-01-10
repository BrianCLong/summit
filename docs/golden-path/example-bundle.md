# Reference Evidence Bundle (Example)

This example shows the artifacts produced by `golden-path-supply-chain` for the `authz-gateway` reference image.

```text
artifact: ghcr.io/<owner>/summit-authz-gateway@sha256:EXAMPLE_DIGEST
signature: cosign keyless signature (issuer: https://token.actions.githubusercontent.com,
  subject: https://github.com/<repo>/.github/workflows/_reusable-slsa-build.yml@refs/heads/main)
provenance: cosign attest --type slsaprovenance (payload stored in registry)
sbom_cyclonedx: sbom.cdx.json (hash: sha256:EXAMPLE_CDX)
sbom_spdx: sbom.spdx.json (hash: sha256:EXAMPLE_SPDX)
```

To validate in a clean environment:

```bash
cosign verify ghcr.io/<owner>/summit-authz-gateway@sha256:EXAMPLE_DIGEST \
  --certificate-identity-regexp '^https://github.com/.+/\\.github/workflows/_reusable-slsa-build.yml@.*$' \
  --certificate-oidc-issuer https://token.actions.githubusercontent.com

cosign verify-attestation ghcr.io/<owner>/summit-authz-gateway@sha256:EXAMPLE_DIGEST --type slsaprovenance
cosign verify-attestation ghcr.io/<owner>/summit-authz-gateway@sha256:EXAMPLE_DIGEST --type cyclonedx
```
