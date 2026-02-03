# Evidence Validate (spec)

Must fail if:

- evidence JSON files violate schemas
- timestamps appear outside stamp.json
- evidence/index.json missing mapping entries

Must pass if:

- report.json, metrics.json, and stamp.json validate for each evidence_id
