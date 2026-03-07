# Evidence Bundle Verifier

The Evidence Bundle Verifier is a tool designed to validate the integrity and structure of Evidence Bundle Manifests before they are used in the release pipeline or hydrated into final bundles.

## Purpose

This tool ensures that:

1.  **Schema Validity**: The manifest adheres to the defined JSON schema.
2.  **Referenced Integrity**: All files referenced in the manifest (evidence logs, descriptors, scripts, runbooks) actually exist in the repository.
3.  **Redaction Compliance**: Sensitive fields in the source manifest are properly templatized or redacted, preventing accidental commit of real secrets or production data.

## Usage

Run the verifier script using `npx tsx` (requires `zod` installed in root modules):

```bash
npx tsx scripts/verify-evidence-bundle.ts <path-to-manifest>
```

### Example

```bash
npx tsx scripts/verify-evidence-bundle.ts EVIDENCE_BUNDLE.manifest.json
```

## Validation Checks

### 1. Schema Validation

The manifest must follow the strict schema defined in the script, including:

- `evidence_bundle`: Metadata about the release.
- `release_metadata`: Build and commit info.
- `ci_quality_gates`: List of quality gates and their evidence files.
- `acceptance_packs`: List of acceptance tests.
- `load_tests`: Configuration for load testing.
- `chaos_scenarios`: References to chaos engineering runbooks.
- `sbom`: Path to the Software Bill of Materials.

### 2. Referenced File Existence

Every path specified in the manifest is checked for existence relative to the **repository root (CWD)**. This includes:

- `evidence` paths in quality gates.
- `descriptor` paths in acceptance packs.
- `script` paths in load tests.
- `runbook` paths in chaos scenarios.
- `path` in SBOM configuration.

### 3. Redaction Markers

The verifier enforces that specific fields in `release_metadata` (e.g., `git_commit`, `approver`) are NOT hardcoded values in the source manifest. They must be:

- Template placeholders (e.g., `{{ .Release.GitCommit }}`)
- OR Explicitly marked as redacted (containing "REDACTED" string)

This prevents sensitive release information from being hardcoded in the source control manifest.

## Integration

This script is intended to be run:

- **Pre-commit**: To ensure developers don't break the manifest.
- **CI Pipeline**: As a gate before the release process begins.
