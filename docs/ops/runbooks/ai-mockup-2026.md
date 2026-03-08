# Runbook: ai-mockup-2026

## Execute benchmark
```bash
python3 benchmarks/ai-mockup-2026/runner.py --check
```

## Rebaseline determinism fixture
```bash
python3 benchmarks/ai-mockup-2026/runner.py --update-fixture
```

## Update tool list
1. Edit `benchmarks/ai-mockup-2026/tools.yaml`
2. Add claim mapping in `benchmarks/ai-mockup-2026/fixtures/ground_truth_claims.json`
3. Re-run benchmark and tests

## Rollback
- Revert `benchmarks/ai-mockup-2026/*` and `reports/ai-mockup-2026/*` to previous commit.
- Re-run `python3 benchmarks/ai-mockup-2026/runner.py --check`.

## SLO
- Weekly benchmark workflow success rate: >= 99%.
