# Repository Monitoring & CI Health

This document outlines the scheduled automation workflows running in the repository to continuously monitor CI health, code determinism, repository entropy, and supply chain security.

## Philosophy
- **Deterministic Outputs**: All reporting metrics output stable, canonically sorted JSON without random IDs or timestamps mixed into the data fields. Time-bound attributes are kept separate (e.g., in `stamp.json`).
- **Minimal Permissions**: Workflows run with minimal required read-only access to `contents`, and `issues: write` only when issue creation is necessary.
- **Low Blast Radius**: Monitoring tasks are executed strictly as checks. They do not commit, push, or run destructive tasks on the repository. They notify the team strictly via GitHub Issues when predefined thresholds are breached.

## Hourly Monitoring (`0 * * * *`)
Configured in `.github/workflows/monitoring.yml`.

### 1. CI Health (`ci_health.ts`)
- Scans the last 100 workflow runs via the GitHub API.
- Generates `ci-health.json` detailing failure rates per workflow.
- **Threshold**: Raises an issue if any workflow's failure rate exceeds **20%**.

### 2. Determinism Drift (`determinism_drift.ts`)
- Inspects baseline AI evaluation data in `artifacts/ai-evals/`.
- Scans and detects non-deterministic field leakage (e.g., raw ISO dates, UUIDs) in standard evaluation results.
- Generates `determinism-drift.json`.
- **Threshold**: Raises an issue immediately if non-deterministic fields are caught in files expected to be stable.

### 3. Repository Entropy (`repo_entropy.ts`)
- Tracks repository maintenance metrics: count of open PRs, open issues, and the average runtime of recent completed CI checks.
- Generates `repo-health.json`.
- **Threshold**: Raises an issue if the number of open PRs exceeds **50**.

### 4. Security Drift (`security_drift.ts`)
- Audits the `pnpm` lockfile for emergent CVEs via `pnpm audit`.
- Generates `security-health.json` containing total counts of critical and high vulnerabilities.
- **Threshold**: Raises an issue if any **High** or **Critical** vulnerabilities are detected.

## Daily Benchmarks (`0 0 * * *`)
Configured in `.github/workflows/daily-benchmarks.yml`.

### GraphRAG Benchmark (`run-graphrag.ts`)
- Generates precision, recall, coverage, and F1 metrics for GraphRAG inference targets.
- Outputs are heavily scrutinized for determinism. Wall-clock references are strictly siloed into a supplementary `stamp.json`, leaving `metrics.json` and `report.json` fully hash-stable run over run.
