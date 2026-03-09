# Cosign v2 Verification Migration Guide

## Overview

As part of aligning our supply chain verification policies with Rekor v2 and improving security hygiene, we have updated all signature and attestation verification procedures. The minimum acceptable version of `cosign` is now `v3.7.0` in our CI pipelines, and all `cosign verify`, `cosign verify-blob`, and `cosign verify-attestation` operations strictly require `--use-signed-timestamps` when interacting with the transparency log.

## Breaking Changes

1. **`cosign verify*` requires `--use-signed-timestamps`**
   - Any script, pipeline, or local tooling executing `cosign verify`, `cosign verify-blob`, or `cosign verify-attestation` without the `--use-signed-timestamps` flag against the public Rekor transparency log will now fail.
   - Example failure: `Error: failed to verify timestamp...` or missing timestamp errors.

2. **Minimum `cosign` version**
   - We are enforcing `sigstore/cosign-installer@v3.7.0` across all GitHub Actions.
   - Downstream actions running versions below `v3.6.0` or using older APIs may encounter unexpected errors when interacting with v2 transparency logs or parsing signatures.

## Migration Steps for Downstream Repositories

### 1. Update GitHub Actions workflows

Search for `sigstore/cosign-installer` in your workflows and update it to `v3.7.0`:

```yaml
# Before
- uses: sigstore/cosign-installer@v3.5.0

# After
- uses: sigstore/cosign-installer@v3.7.0
```

*Note: Even if you are using a generic `@v3` tag, we highly recommend pinning to `v3.7.0` (or its SHA) to ensure stability and compatibility with these new requirements.*

### 2. Update all Verification Scripts

Search your codebase (bash scripts, Makefiles, JS scripts invoking `exec`, etc.) for any `cosign verify` commands and append `--use-signed-timestamps`.

**Image Verification:**
```bash
# Before
cosign verify --certificate-identity-regexp ".*" --certificate-oidc-issuer "https://token.actions.githubusercontent.com" "$IMAGE"

# After
cosign verify --use-signed-timestamps --certificate-identity-regexp ".*" --certificate-oidc-issuer "https://token.actions.githubusercontent.com" "$IMAGE"
```

**Blob Verification:**
```bash
# Before
cosign verify-blob --signature "$SIG" "$FILE"

# After
cosign verify-blob --use-signed-timestamps --signature "$SIG" "$FILE"
```

**Attestation Verification:**
```bash
# Before
cosign verify-attestation --type slsaprovenance "$IMAGE"

# After
cosign verify-attestation --use-signed-timestamps --type slsaprovenance "$IMAGE"
```

### 3. Handle Local Developer Environments

If developers on your team run these scripts locally, they must upgrade their local `cosign` binary to `v3.7.0` or higher.
Using a package manager:
- Homebrew: `brew upgrade cosign`
- Download binaries directly from [sigstore/cosign releases](https://github.com/sigstore/cosign/releases).

### 4. CI Failure Messaging

Ensure your scripts provide explicit failure messaging if verification fails, as required by the new standard. Example:

```bash
if ! cosign verify --use-signed-timestamps "$IMAGE"; then
    echo "::error::Supply chain verification failed! Missing or invalid signed timestamps for $IMAGE. Ensure --use-signed-timestamps is used and the signature was recorded in the transparency log."
    false
fi
```
