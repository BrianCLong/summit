# Output PII Leak Delta Guard (OPLD)

The OPLD harness compares language-model runs for regressions in personally identifiable information (PII) leakage. It layers a regex-based detector with a lightweight heuristic NER pass and reports delta scores for each entity type and value.

## Components

- `detectors.py` — layered detection primitives (regex + heuristic NER).
- `analysis.py` — loaders, aggregation logic, scoring, and report generation.
- `cli.py` — Python entrypoint that emits a deterministic JSON report and CI gate status.
- `run-opld.ts` — TypeScript runner that shells out to the Python CLI and prints CI-friendly summaries.
- `tests/` — unit coverage for log loading and delta scoring behaviour.

## Usage

Run the Python CLI directly:

```bash
python tools/opld/cli.py --baseline runs/baseline.jsonl --candidate runs/candidate.jsonl --threshold 0.15 --output report.json --pretty
```

Or invoke via the TypeScript harness (requires `ts-node` in PATH):

```bash
npx ts-node tools/opld/run-opld.ts --baseline runs/baseline.jsonl --candidate runs/candidate.jsonl --threshold 0.15
```

Both commands exit non-zero when the leak delta score exceeds the configured threshold, providing a CI gate for regression detection.
