# Sigstore Toolchain Version Policy

## Summary

Summit enforces minimum Sigstore toolchain versions to prevent known availability and
verification risks. This policy is enforced by the CI gate in
`scripts/ci-sigstore-version-gate.sh` and emits evidence artifacts on every run.

## Minimum Versions

| Tool | Minimum Version | Rationale |
| --- | --- | --- |
| Cosign | v3.0.2 | Avoids missing artifact key signatures in v3.0.1 and aligns with bundle-first verification defaults. |
| Rekor | v1.5.0 | Fixes the COSE v0.0.1 nil-pointer panic that could return 500s for malformed proposed entries. |

## Enforcement

* The gate fails closed if `cosign` is missing or below the minimum.
* Rekor validation must resolve either `rekor-cli` or a `REKOR_URL` endpoint. Failure to
  resolve a version fails closed.
* Evidence artifacts are written to `evidence/EV-<gitsha12>-<pipeline>-<utc>/`:
  * `report.json`
  * `metrics.json`
  * `stamp.json`

## Operator Notes

* Prefer bundle-first verification for cosign v3 workflows.
* If a Rekor endpoint is upgraded, ensure the gate is rerun to regenerate evidence.
