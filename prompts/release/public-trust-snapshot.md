# Public Trust Snapshot Prompt

Produce a public, redacted trust snapshot derived from the GA Evidence Bundle. The snapshot must be
customer-safe, deterministic, schema-validated, and attached as a CI artifact on successful GA
Gate runs.

## Requirements

- Generate `trust_snapshot.json` and `trust_snapshot.md` from GA evidence.
- Enforce allowlist-only fields and redaction scanners for secrets, internal hosts, private URLs,
  emails, and absolute paths.
- Provide SBOM summary, vulnerability counts, reproducible-build digests, governance verdict,
  schema hash, smoke and GA gate status.
- Wire a `ga / trust-snapshot` job in CI that runs after `ga / gate` and uploads
  `trust-snapshot_<sha>_<runid>.zip` plus the JSON artifact.
- Add documentation in `docs/release/TRUST_SNAPSHOT_SPEC.md` and update the GA checklist.
- Provide tests for schema validation, determinism, redaction, and missing sections.

## Deliverables

- `docs/release/TRUST_SNAPSHOT_SPEC.md`
- `schemas/trust_snapshot.schema.json`
- `scripts/release/generate_trust_snapshot.ts` with tests and fixtures
- GA Gate workflow integration producing public trust snapshot artifacts
