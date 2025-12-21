# Dependency Management Tools

This directory contains tools for enforcing dependency policies and generating SBOMs.

## `deps-policy-check`

Enforces the following policies:
1.  **Lockfile Integrity**: Ensures `pnpm-lock.yaml` is present and unchanged in CI.
2.  **Pinned Dependencies**: Forbids unpinned git dependencies (must have a commit hash).
3.  **Approved Licenses**: Checks installed dependencies against an allowed list of licenses.

### Usage

```bash
./tooling/deps/deps-policy-check.ts [flags]
```

Flags:
- `--warn-only`: Report violations but exit with success code (0).
- `--enforce`: Exit with error code (1) on violations. (Default)
- `--ci`: Enable CI-specific checks (lockfile immutability).

### Configuration

Configuration is located at `tooling/deps/config/approved-licenses.json`.

```json
{
  "approved": ["MIT", "Apache-2.0", ...],
  "ignoredPackages": ["internal-package-name"]
}
```

## `generate-sbom`

Generates a CycloneDX SBOM (Software Bill of Materials) for the project.

### Usage

```bash
./tooling/deps/generate-sbom.ts [output-path]
```

Default output is `sbom.json`.
