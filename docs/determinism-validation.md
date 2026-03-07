# Determinism Validation

To ensure supply chain security and provenance guarantees, Summit's release pipelines rely on reproducible, deterministic builds and bundle generations.

## Deterministic Build Variables

The following environment variables are used as the single source of truth to ensure builds and artifacts are perfectly reproducible:

* `DETERMINISTIC_BUILD`: Must be set to `true` to enable deterministic outputs.
* `SOURCE_DATE_EPOCH`: A Unix timestamp (in seconds) used for any time-based operation (e.g. `generated_at` metadata fields, archive timestamps).
* `GITHUB_SHA` or `GIT_COMMIT_SHA`: Used as the single source of truth for the commit hash, overriding dynamic `git rev-parse HEAD` calls to ensure stability across build environments.

## Validating Locally

You can run the determinism checks locally before pushing your code.

1. Generate a test script to compare outputs of the provenance bundle tool:

```bash
export DETERMINISTIC_BUILD=true
export SOURCE_DATE_EPOCH=1700000000
export GIT_COMMIT_SHA=$(git rev-parse HEAD)

mkdir -p /tmp/run1 /tmp/run2

cd /tmp/run1
node <path-to-repo>/scripts/generate-provenance-bundle.cjs
hash1=$(sha256sum provenance/export-manifest.json | awk '{print $1}')

cd /tmp/run2
node <path-to-repo>/scripts/generate-provenance-bundle.cjs
hash2=$(sha256sum provenance/export-manifest.json | awk '{print $1}')

if [ "$hash1" = "$hash2" ]; then
    echo "Determinism check passed! ($hash1)"
else
    echo "Check failed!"
    diff /tmp/run1/provenance/export-manifest.json /tmp/run2/provenance/export-manifest.json
fi
```

## Validating in CI

The reproducibility assertion is automated in the GitHub Actions workflow at `.github/workflows/reproducibility.yml`.

In this workflow, the provenance generation step runs identically twice under an explicit `DETERMINISTIC_BUILD=true` context. It then strictly compares the `sha256sum` of the generated metadata and bundle manifests.

If the output diverges, the build immediately fails, allowing developers to inspect the differing artifacts via `diff`.
