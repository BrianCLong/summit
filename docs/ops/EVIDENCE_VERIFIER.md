# Evidence Bundle Verifier

The `verify-evidence-bundle` tool ensures that an Evidence Bundle Manifest (`manifest.json`) is syntactically correct and that all referenced artifacts exist on disk. This is a critical step in the release process to guarantee the integrity of the evidence bundle before it is signed or archived.

## Usage

```bash
npx tsx scripts/verify-evidence-bundle.ts <path-to-manifest>
```

Example:

```bash
npx tsx scripts/verify-evidence-bundle.ts EVIDENCE_BUNDLE.manifest.json
```

## Validation Rules

The verifier performs the following checks:

### 1. Schema Validation
Validates that the JSON structure conforms to the expected schema.
- **Required Root Fields**: `evidence_bundle`, `release_metadata`, `ci_quality_gates`.
- **Evidence Bundle Metadata**: Must contain `version`, `release`, `product`, `created_at`, `environment`.
- **Quality Gates**: `ci_quality_gates` must be a list of objects, each containing `name`, `status`, and `evidence`.

### 2. Referenced Artifacts
Iterates through all file paths referenced in the manifest and verifies they exist on the filesystem.
- `ci_quality_gates[].evidence`
- `acceptance_packs[].descriptor`
- `load_tests.script`
- `chaos_scenarios[].runbook`
- `sbom.path`

### 3. Redaction Markers
Checks `release_metadata` for potential unredacted secrets.
- Fields containing "token", "secret", or "key" in their name are flagged with a warning if their value is not a Go template (e.g., `{{ .Secret }}`) or explicitly `[REDACTED]`.

## Exit Codes

- `0`: Verification Passed.
- `1`: Verification Failed (Schema errors, missing files, or invalid arguments).
