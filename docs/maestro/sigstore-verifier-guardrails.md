# Sigstore Verifier Guardrails (Rekor + Cosign)

## Baseline requirements

- **Rekor** must be **v1.5.0+** to avoid the COSE v0.0.1 panic (CVE-2026-23831).
- **Cosign** must be **v3.0.2+** to ensure bundle-first verification and current TUF metadata behavior.
- All verifier pipelines must **fail closed** on version mismatch or trust-root initialization failures.

## CI enforcement

Use the Sigstore version gate in verifier workflows:

```bash
scripts/ci/check-sigstore-versions.sh
```

Environment overrides:

- `MIN_COSIGN_VERSION` (default `3.0.2`)
- `MIN_REKOR_VERSION` (default `1.5.0`)
- `REKOR_URL` (default `https://rekor.sigstore.dev`)

## Rekor malformed COSE health check

Run the COSE panic probe against **self-hosted** Rekor instances only:

```bash
REKOR_URL="https://rekor.example" \
REKOR_MALFORMED_TEST=true \
REKOR_HEALTHCHECK_CONFIRM=true \
./scripts/ci/rekor-cose-healthcheck.sh
```

The probe submits a deliberately malformed COSE entry and fails if Rekor responds with 500.

## Operational guardrails

1. **Pin Rekor**: enforce v1.5.0+ on any log service your verifiers use.
2. **Pin Cosign**: enforce v3.0.2+ across CI/CD and local verifier tooling.
3. **Initialize trust roots**: run `cosign initialize` (or use a pinned `trusted_root.json`) before verification.
4. **Bundle-first verification**: prefer `cosign verify-blob --bundle` when verifying detached artifacts.
5. **Gate provenance**: treat any version mismatch as a failure in provenance verification.
