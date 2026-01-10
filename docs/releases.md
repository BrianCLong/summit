# Release Policy and Freeze Windows

This document outlines how to manage the release policy, including the configuration of release freeze windows.

## Editing the Release Policy

The release policy is defined in the `release-policy.yml` file at the root of the repository. This file controls various aspects of the release process, including the default release branch and release freeze windows.

### Validating the Policy

Before committing any changes to `release-policy.yml`, it is important to validate the file to ensure it is well-formed. You can do this by running the following command:

```bash
pnpm lint:release-policy
```

This command will check the syntax and structure of the file and report any errors.

## Release Bundle Action

The release logic has been consolidated into a composite action located at `.github/actions/release-bundle`.

### Usage

This action standardizes the release process by:

1. Validating preflight checks (image existence, digests)
2. Enforcing freeze policies (unless overridden)
3. Classifying tags (GA vs RC) and resolving previous tags
4. Generating comprehensive evidence bundles (SBOMs, signatures, logs)
5. Verifying the evidence bundle manifest

**Example Usage in Workflow:**

```yaml
- name: Checkout
  uses: actions/checkout@v4
  with:
    fetch-depth: 0

- name: Create Release Bundle
  id: bundle
  uses: ./.github/actions/release-bundle
  with:
    tag: ${{ github.ref_name }}
    dry_run: false
    # override_freeze: true
    # override_reason: "Hotfix for security issue"

- name: Publish Release
  uses: softprops/action-gh-release@v2
  with:
    files: ${{ steps.bundle.outputs.bundle_path }}
    prerelease: ${{ steps.bundle.outputs.channel == 'rc' }}
```
