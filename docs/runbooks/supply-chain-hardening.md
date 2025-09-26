# Supply‑Chain Hardening

## SBOM (CycloneDX)
```bash
npm i -D @cyclonedx/cyclonedx-npm
npx @cyclonedx/cyclonedx-npm --output-format json --output-file sbom.json
```

Add `sbom.json` to the `ci-evidence` artifact.

## Provenance

* Plan SLSA provenance attestation in release workflow.
* Sign container images (e.g., cosign) and attach signatures to releases.
