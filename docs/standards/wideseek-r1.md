# WideSeek-R1 Standards

## Artifacts
Each run MUST produce:
- `evidence/final.md`: The final report.
- `evidence/metrics.json`: Stats.
- `evidence/report.json`: Full context.
- `evidence/stamp.json`: Metadata (run ID, commit).

## Metrics
- **Item F1**: Accuracy of extracted items vs ground truth.
- **Row F1**: Accuracy of full rows.
- **Success Rate**: Binary success flag.

## Security
- All tool outputs are **untrusted**.
- No raw HTML logging.
- PII redaction active.
