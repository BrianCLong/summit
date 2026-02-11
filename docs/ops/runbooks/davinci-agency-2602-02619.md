# Runbook: Long-Horizon Agency Evaluation

## Local Execution
To run a long-horizon evaluation fixture locally:
```bash
pnpm test tests/agents/longhorizon/evaluator.test.ts
```

## Adding New Data
1. Prepare a JSONL file matching the `PRChainRecord` schema.
2. Place it in `tests/fixtures/longhorizon/`.
3. Add a new test case or use the `scripts/agents/longhorizon/run-fixture.ts` (if available).

## Troubleshooting
- **Determinism Regression**: Check if `runtime_ms` or other non-deterministic fields are being included in the content hash.
- **Security Block**: If a PR contains a secret, the `ci-security` workflow will fail. Review the logs and redact the fixture.
