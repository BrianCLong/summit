# Prompt: Playwright CLI Runner MWS

## Objective

Implement a feature-flagged Playwright CLI runner with deterministic evidence outputs, smoke spec support, and test coverage.

## Required Outputs

- `scripts/playwright-cli-runner.mjs`
- `scripts/summit-playwright-cli.mjs`
- `specs/playwright/todomvc.smoke.json`
- `tests/playwright-cli/runner.test.mjs`
- `package.json`
- `docs/standards/playwright-cli-vs-mcp.md`
- `docs/ops/runbooks/playwright-cli-vs-mcp.md`
- `repo_assumptions.md`
- `docs/roadmap/STATUS.json`

## Constraints

- `SUMMIT_ENABLE_PLAYWRIGHT_CLI=1` required for run-spec execution.
- Deterministic `run_id` and JSON output ordering.
- Reject command injection and disallowed domains.

