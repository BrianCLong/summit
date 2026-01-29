# Evidence Bundles

Evidence bundles capture machine-validated proof of governance, evaluation, and release readiness.
All evidence artifacts must be registered in `evidence/index.json` and validated via
`tools/evidence_validate.py`.

## Required files per evidence ID

Each evidence ID must register the following files:

- `report.json`: human-readable summary of what was validated.
- `metrics.json`: machine-readable metrics (numeric or categorical).
- `stamp.json`: the only file allowed to contain timestamps.

## Timestamp containment

Timestamp-like fields (`created_at`, `generated_at`, `updated_at`, `timestamp`, `time`, `ts`) are
restricted to `stamp.json`. Any timestamp keys elsewhere fail validation.

## Evidence ID format

Evidence IDs must follow `EVD-<PROGRAM>-<AREA>-<NNN>` where `<NNN>` is a three-digit counter.
Example (Arcee Trinity program): `EVD-ARCEE-TRINITY-LICENSE-001`.

## Validation command

Run the validator from repo root:

```bash
python tools/evidence_validate.py --schemas evidence/schemas --index evidence/index.json
```

## Governance alignment

Evidence artifacts must reference authoritative policy, model registry, or evaluation sources.
If evidence depends on a future decision, record it as `Deferred pending <artifact>` in the
report summary and keep the stamp to immutable timestamps only.
