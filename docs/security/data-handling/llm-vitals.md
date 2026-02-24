# LLM Vitals Data Handling

## Classification
- Benchmark corpus must contain no PII.
- Prompts and outputs are fixture-based in-repo test data.

## Logging Rules
- Never log provider API keys.
- Never print raw secrets from environment variables.
- `report.json` and `metrics.json` must not contain wall-clock timestamps.

## Retention
- Raw vitals artifacts retention target: 30 days in CI artifact storage.
- Baseline metrics retained in git for deterministic regression checks.

## Security Controls
- Fixed benchmark corpus (`evaluation/vitals/benchmark_corpus.jsonl`).
- Seed validation per model fixture.
- Missing metrics are treated as failures.
