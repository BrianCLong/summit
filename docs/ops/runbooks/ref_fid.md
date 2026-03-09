# Runbook: Reference Fidelity

## Execution
Run the benchmark via:
`python3 benchmarks/ref_fid_benchmark.py`

## Drift Detection
Run monitoring:
`python3 scripts/monitoring/ref_fid_drift.py`

## Dataset Refresh
The RefFid dataset contains deterministic subsets. Updates should be processed via `datasets/ref_fid_adapter.py`.
