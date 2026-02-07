# Runbook: RLVR LUSPO Length Bias Monitoring

## Purpose
Provide deterministic evidence for response-length drift/collapse and enable length-neutral RLVR objectives.

## How to Run the Length Report
```
python -m summit.cli.rlvr_length_report --in artifacts/run.jsonl --out reports
```

Optional guards:
```
python -m summit.cli.rlvr_length_report \
  --in artifacts/run.jsonl \
  --out reports \
  --max-len 2048 \
  --overlong-ratio-threshold 0.1 \
  --hash-chain \
  --redact \
  --allow-extra
```

## Interpreting Collapse Flags
* `trend.slope < slope_threshold` and `trend.drop_pct >= drop_threshold` => collapse flagged.
* `policy.overlong_flag` indicates length-gaming risk.

## Enabling LUSPO Objective
Set feature flag `RLVR_OBJECTIVE=luspo` in the training environment. Default remains baseline.

## Rollback
* Disable `RLVR_OBJECTIVE=luspo`.
* Re-run the length report to confirm stabilization.

## Monitoring Spec
Schedule a weekly job to scan the latest training artifacts and track length trends. Alert if:
* Collapse flag is true across two consecutive windows.
* Overlong ratio exceeds threshold for two runs.
