# Monitoring: one-engineer-production-saas-governance

## Drift Check

Run:

```bash
python3 scripts/monitoring/one-engineer-production-saas-governance-drift.py
```

Expected output includes deterministic hashes for `report.json`, `metrics.json`, and `stamp.json`, plus a bundle hash.

To enforce drift failure against a previous known-good hash:

```bash
python3 scripts/monitoring/one-engineer-production-saas-governance-drift.py \
  --previous-hash "<prior_bundle_hash>" \
  --fail-on-drift
```

Workflow: `.github/workflows/governance-pack-drift.yml` runs this check nightly.

## Alert Condition

- Raise an alert when any hash changes without a corresponding update to `governance/one-engineer-production-saas-governance/input.spec.json`.
