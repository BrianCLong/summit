# Repository Monitoring Architecture

Summit employs automated scheduled GitHub Actions workflows to continuously monitor the repository's health, CI pipelines, deterministic outputs, and performance benchmarks. This ensures a "Jenkins-like" continuous feedback loop without manual prompting.

## Principles
- **Deterministic Outputs:** All generated JSON artifacts are strictly sorted and formatted to ensure structural stability.
- **Minimal Permissions:** Workflows use explicitly granted read permissions, and restricted write capabilities tailored to the task (e.g., issue creation).
- **Low Blast Radius:** Scripts use safe fallbacks and exit gracefully so failures don't hang the repository or deplete resources.
- **Actionable Alerts:** GitHub Issues are automatically created _only_ when defined thresholds are breached.

## Schedules

### Hourly Monitoring (`cron: "0 * * * *"`)

The `.github/workflows/monitoring.yml` workflow runs four discrete TypeScript checks, archiving outputs to the `artifacts/monitoring/` directory:

1. **CI Health** (`scripts/monitoring/ci_health.ts`)
   - Reads recent workflow run states via GitHub REST API.
   - Computes workflow failure rates.
   - Output: `ci-health.json`
   - **Alert Threshold:** Triggers if a workflow's failure rate exceeds 50% across 3 or more runs.

2. **Determinism Drift** (`scripts/monitoring/determinism_drift.ts`)
   - Evaluates files in `artifacts/ai-evals` against `artifacts/ai-evals-baseline`.
   - Detects drift in timestamps, UUIDs, or array lengths.
   - Output: `determinism-drift.json`
   - **Alert Threshold:** Triggers if any drift is detected.

3. **Repository Entropy** (`scripts/monitoring/repo_entropy.ts`)
   - Measures Open Pull Requests, Open Issues, and average CI runtime.
   - Output: `repo-health.json`
   - **Alert Threshold:** Triggers if PR count > 50, Issue count > 100, or average CI runtime > 30 minutes.

4. **Security Drift** (`scripts/monitoring/security_drift.ts`)
   - Scans dependency lockfiles or runs basic security checks.
   - Output: `security-health.json`
   - **Alert Threshold:** Triggers if any critical vulnerabilities are detected.

### Daily Benchmarks (`cron: "0 0 * * *"`)

The `.github/workflows/daily-benchmarks.yml` workflow executes the core intelligence benchmarking engine daily, archiving outputs to `artifacts/benchmarks/graphrag/`.

1. **GraphRAG Benchmark** (`scripts/benchmarks/run-graphrag.ts`)
   - Simulates retrieval tasks against `evaluation/benchmarks/graphrag/cases.json`
   - Outputs: `metrics.json` (aggregate scores), `report.json` (per-task results).
   - Generates `stamp.json` to capture workflow run ID, actor, SHA, and UTC timestamp.
   - **Alert Threshold:** Creates an issue if the underlying benchmarking script fails execution.
