# CI Bootstrap Failure Analysis

## Issue
Many CI workflows fail with a `git exit 128` error. This typically occurs during standard versioning, changelog generation, or any operation that requires full git history and tags.

## Root Cause
The `actions/checkout` action by default fetches only a shallow commit (depth=1). When the CI steps require git history (e.g. for creating changelogs or computing standard versions based on previous tags/commits), git fails with an error `128` because the local repository doesn't have the necessary commits and tags.

## Fix Matrix
The fix requires explicitly configuring the `actions/checkout` action to fetch the full history and tags.
According to our repository guidelines, "To prevent 'git exit 128' errors during CI operations that require git history (e.g., standard versioning, changelog generation), GitHub Actions workflows must specify fetch-depth: 0 and fetch-tags: true when using actions/checkout."

| Affected Workflow | Problematic Step | Required Configuration |
| :--- | :--- | :--- |
| `.github/workflows/ci-core.yml` | `actions/checkout@v4` | `fetch-depth: 0`, `fetch-tags: true` |

## Proposed Fix
We will apply a minimal bootstrap repair by modifying the central `ci-core.yml` workflow, and ensuring `actions/checkout` step includes the required configuration. Since `ci-core.yml` is the primary continuous integration pipeline, applying the fix there provides the smallest central fix.

```yaml
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
          fetch-tags: true
```
