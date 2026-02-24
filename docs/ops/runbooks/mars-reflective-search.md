# Runbook: MARS Reflective Search

## Execution

### Dry Run (Recommended)
Produces all artifacts without external API calls or training.
```bash
python -m summit.mars.run --dry-run --budget 100 --topic "Sample Research"
```

### Full Run
Requires configured environment and budget.
```bash
python -m summit.mars.run --budget 500 --topic "Deep Research"
```

## Interpreting Artifacts
- **Check Budget**: Inspect `ledger.json` for `total_spent`.
- **Review Lessons**: Inspect `lessons.json` for distilled insights.
- **Verify Determinism**: Compare `plan.json` across runs with same seed.

## Troubleshooting
- **Budget Exceeded**: Increase `--budget` or simplify the search iterations in `planner_mcts.py`.
- **Schema Invalid**: Ensure `summit/mars/schemas/` matches artifact structure.
- **Redaction Failure**: Update `summit/mars/redact.py` with new patterns.
