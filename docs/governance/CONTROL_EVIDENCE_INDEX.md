Owner: Governance
Last-Reviewed: 2026-01-14
Evidence-IDs: control_evidence_index
Status: active

# Control → Evidence Index

## Purpose

`control_evidence_index.json` provides a machine-verifiable link between SOC controls and
concrete evidence artifacts for a specific commit. It is generated during GA evidence
collection and validated as a required gate.

## Schema (summary)

- `meta`
  - `commit_sha`
  - `generated_at_utc`
  - `repo`
- `controls[]`
  - `control_id`
  - `title`
  - `coverage_status`: `covered` | `partially_covered` | `deferred`
  - `evidence[]`
    - `evidence_type`: `unit_test` | `integration_test` | `security_scan` | `sbom` | `config_assertion` | `policy_doc` | `manual_process`
    - `artifact_path`: path inside bundle or repo path for policy docs
    - `artifact_location`: `bundle` | `repo`
    - `producer`: command or job name
    - `verification`: verification hint
    - `checksums.sha256`: required for bundle artifacts
  - `exceptions[]`
    - `exception_id`, `owner`, `reason`, `expiry_date_utc`, `approved_by`

## Sources of Truth

- Required controls: `compliance/control-map.yaml`
- Exceptions: `compliance/control-exceptions.yml`
- Evidence bundle: `dist/evidence/<sha>/`

## Local Usage

```bash
# Create a minimal local evidence bundle (dev only)
make ga-evidence

# Generate index
python3 scripts/evidence/generate_control_evidence_index.py --evidence-dir dist/evidence/<sha>

# Validate evidence
python3 scripts/evidence/validate_control_evidence.py --evidence-dir dist/evidence/<sha>
```

## Operator workflow

- Add or update controls in `compliance/control-map.yaml`.
- Add new evidence types by extending `evidence_type` values in
  `scripts/evidence/generate_control_evidence_index.py`.
- Record exceptions in `compliance/control-exceptions.yml` with owner and expiry.
- CI can optionally allow stub evidence via `ALLOW_STUB_EVIDENCE=1`, but GA should
  prefer real evidence bundles for release gates.

## Policy

- Covered controls must include at least one evidence item with a producer. Bundle
  artifacts require a valid checksum; repo evidence is allowed for policy/process
  documentation.
- Deferred/partially covered controls require a non-expired exception or a policy doc evidence item.
- Missing artifacts or checksum mismatches fail GA.
