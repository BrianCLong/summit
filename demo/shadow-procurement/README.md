# Demo: Shadow Procurement Network

## One-Command Run
```bash
make summit-up
make demo-shadow-network
```

## Expected Output Artifacts
- `runs/demo-shadow/ingestion.log`
- `runs/demo-shadow/normalized_entities.json`
- `evidence-bundle/demo-shadow/run.json`
- `evidence-bundle/demo-shadow/provenance.json`
- `evidence-bundle/demo-shadow/evidence.json`
- `evidence-bundle/demo-shadow/insights.json`
- `evidence-bundle/demo-shadow/policy_checks.json`

## Verification Queries
- Hub entity appears in insights feed.
- At least one sanctions proximity insight emitted.
- At least one policy escalation marked `human_review_required`.
