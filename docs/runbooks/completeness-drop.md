# Completeness Drop Runbook

- Symptom: `PipelineCompletenessDrop` alert or ratio < 0.98.
- Indicators: `pipeline_completeness_ratio`, record counts by partition, DLQ growth.
- Possible causes: missing partitions, upstream schema change, filter misconfig, dedupe overshoot.
- Immediate actions:
  - Compare expected vs actual by time window.
  - Check DLQ reasons; validate schema contracts.
  - Verify partition discovery and scheduler coverage.
- Resolution steps:
  - Patch connector to accommodate schema changes.
  - Reprocess missing windows; tune dedupe rules.
  - Adjust filters and data contracts.
- Validation: Ratio returns >= 0.99 over next 6–24 hours.
