# Supply Chain CVE Version Floors

## Cosign bundle verification (CVE-2026-22703)

**Minimum version:** `3.0.4`

**Rationale:** Crafted Sigstore bundles could be accepted even when the embedded Rekor
entry did not reference the expected artifact digest/signature/key. Cosign versions
prior to 3.0.4 are affected, so verification jobs must enforce a minimum version floor
before any bundle-first verification executes.

**Enforcement points:**

- `.github/scripts/sigstore/check-cosign-version.sh` blocks versions below 3.0.4.
- `.github/actions/sigstore-verify/action.yml` calls the version guard before install.

**Emergency override:** Only via a documented, time-limited governance exception.
