# Graph Validator

A tool to monitor graph degree-distribution drift by comparing a baseline degree distribution to a sliding window of recent activity using an online / sketch-based KS-style distance.

## Usage

### 1. Build Baseline
```bash
python3 -m graph_validator.cli baseline build --input baseline.jsonl --output baseline.json
```

### 2. Run Validation
```bash
python3 -m graph_validator.cli window run \
  --input window.jsonl \
  --baseline baseline.json \
  --out-dir out/ \
  --threshold-d 0.05
```

## Output
Generates `report.json`, `metrics.json`, `stamp.json`, and `report.html` in the output directory.
