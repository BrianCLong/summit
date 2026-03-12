1. **Create/Update Monitoring Scripts (Hourly)**
    - `scripts/monitoring/ci_health.ts`: Fetch workflow runs from GitHub API (`GET /repos/{owner}/{repo}/actions/runs`), compute failure rates per workflow, output to `artifacts/monitoring/ci-health.json`.
    - `scripts/monitoring/determinism_drift.ts`: Compare `artifacts/ai-evals` outputs to baselines, detect drift (e.g. random IDs, timestamps), output to `artifacts/monitoring/determinism-drift.json`.
    - `scripts/monitoring/repo_entropy.ts`: Fetch PR count, issue count, and average CI runtime from GitHub API, output to `artifacts/monitoring/repo-health.json`.
    - `scripts/monitoring/security_drift.ts`: Run a simple security check or file scan (mock logic if no actual SBOM tool is specified, but ensure it meets requirements), output to `artifacts/monitoring/security-health.json`.

2. **Create Workflows**
    - `.github/workflows/monitoring.yml`: Runs on `schedule` (`cron: '0 * * * *'`). Checks out the repo, sets up Node.js, runs the 4 scripts from step 1, uploads artifacts. Issues should only be raised if thresholds are breached.
    - `.github/workflows/daily-benchmarks.yml`: Runs on `schedule` (`cron: '0 0 * * *'`). Checks out repo, runs `scripts/benchmarks/run-graphrag.ts`, outputs `metrics.json`, `report.json`, and generates `stamp.json` with execution info, uploads artifacts.

3. **Documentation**
    - `docs/ci/monitoring.md`: Document the new workflows, schedule (hourly vs daily), and expected JSON artifacts and alert thresholds.

4. **Verify and Pre-commit**
    - Ensure strict deterministic JSON output across all scripts (e.g., sort keys).
    - Ensure scripts work without failing, perhaps by mocking GitHub API responses if `GITHUB_TOKEN` is not present locally, but using `github.rest` in Actions.
    - Run `pre_commit_instructions` tool to verify before submitting.
