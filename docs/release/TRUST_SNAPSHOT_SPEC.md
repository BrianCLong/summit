# Public Trust Snapshot Specification

**Version:** 1.0
**Last Updated:** 2026-01-09

## Purpose

The Public Trust Snapshot is a customer-safe, externally shareable artifact derived from the GA
Evidence Bundle. It provides high-level assurance signals without exposing sensitive data. This
specification aligns with the Summit Readiness Assertion to ensure externally shared evidence is
consistent, governed, and auditable. See `docs/SUMMIT_READINESS_ASSERTION.md` for the governing
readiness baseline.

## Intended Audience

- Customers and prospects evaluating platform readiness
- Partners and auditors reviewing assurance signals
- Internal release leadership preparing public communications

## Redaction Rules (Allowlist)

Only the fields explicitly listed in this spec may be emitted. All other fields and any content
that does not match the allowlist is excluded. The snapshot generator must fail if any disallowed
content is detected.

### Disallowed Content (non-exhaustive)

- Secrets or tokens (e.g., `ghp_`, `xoxb-`, `AKIA`, JWTs, PEM blocks)
- Internal hostnames or private URLs (`.internal`, `.corp`, `localhost`, RFC1918 IPs)
- Employee emails or personal identifiers (unless explicitly public)
- Absolute filesystem paths (`/Users/`, `/home/`, `C:\\Users\\`, `/workspace/`)
- Internal ticket links or private infrastructure references

### Approved Fields (Allowlist)

- Snapshot metadata: `snapshot_version`, `git_sha`, `workflow_run_id`, `generated_at_utc`
- Tool versions: `tool_versions` (node, pnpm, etc.)
- GA gate summary: `ga_gate.status`, `ga_gate.duration_seconds`
- Smoke test summary: `smoke.status`, `smoke.duration_seconds`
- Governance summary: `governance.policy_version`, `governance.status`, `governance.controls_satisfied`
- SBOM summary: `sbom.package_count`, `sbom.top_packages`, `sbom.licenses`
- Vulnerability summary (if present): `vulns.{critical,high,medium,low,cves}`
- Reproducible-build summary: `reproducible_build.status`, `reproducible_build.digest_summary`
- Provenance summary: `provenance.attestation_present`, `provenance.digests`
- Schema integrity: `schema_integrity.schema_hash`, `schema_integrity.schema_hash_algo`
- Optional notes: `notes` (strictly controlled, must pass scanners)

## Snapshot Schema Versioning

- `snapshot_version` is incremented when the schema changes.
- `schemas/trust_snapshot.schema.json` is the authoritative schema.
- `schema_integrity.schema_hash` must be computed from the schema file using SHA-256.

## Output Artifacts

Each successful run produces:

- `trust_snapshot.json` (machine-readable, schema-validated)
- `trust_snapshot.md` (human-readable, derived from JSON)

## Bundle Metadata

The GA Evidence Bundle must include `bundle_metadata.json` with stable, deterministic values used
by the snapshot generator:

```json
{
  "git_sha": "<40-char sha>",
  "workflow_run_id": "<run id>",
  "generated_at_utc": "<ISO-8601 timestamp>",
  "tool_versions": {
    "node": "v20.x",
    "pnpm": "10.x"
  }
}
```

## Determinism

Given the same GA Evidence Bundle inputs, the generator must produce identical outputs. Lists are
sorted deterministically, timestamps come from bundle metadata (not system time), and formatting is
stable across runs.

## Exclusions

The following are explicitly excluded from the public snapshot:

- Raw logs, stack traces, or command output
- Internal endpoints, service names, or hostnames
- Full SBOM contents or dependency trees
- Proprietary policy logic, rules, or control implementations
- Any artifact not listed in the allowlist
