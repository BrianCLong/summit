# Agentic Evaluation Harness: On-Call Runbook

This document provides essential information for operating and troubleshooting the Agentic Evaluation Harness. It covers deployment, monitoring, alerting, and incident response procedures.

## 1. Overview

The Agentic Evaluation Harness is a critical subsystem designed to continuously evaluate the performance, robustness, and correctness of agentic workflows. It performs two-phase evaluations (End-to-End success + stepwise failure analysis), integrates with various judges (LLM, human, hybrid), and provides comprehensive observability through metrics, alerts, and dashboards.

## 2. Go-Live Checklist (15-minute pass)

Before declaring the system live, ensure the following checks are passed:

*   **Migrate & Index Database**:
    ```sql
    CREATE INDEX IF NOT EXISTS eval_runs_workflow_created_idx ON eval_runs (workflow, created_at DESC);
    CREATE INDEX IF NOT EXISTS eval_runs_first_failure_idx ON eval_runs (workflow, first_failure_at);
    ```
*   **Seed Environment Variables**:
    *   Copy `.env.example` to `.env` for local/dev pods and populate with actual values.
    *   Ensure GitHub Actions secrets are configured for CI/CD.
*   **Boot the Service**:
    ```bash
    uvicorn services.evalsvc.app:app --host 0.0.0.0 --port 8080
    ```
*   **Run Evals Locally (Sanity Check)**:
    ```bash
    python -m evals.agentic.cli --runbook r1_rapid_attribution --cases evals/agentic/fixtures/r1/cases.jsonl
    ```
*   **Metrics Endpoint Visible**: Hit your Prometheus scrape target and confirm `agent_eval_*` series exist.
*   **Grafana Dashboard Loads**: Import `dashboards/agentic-evals.json`, verify panels render.
*   **Alerts Wired**: Create three alert rules (pass-rate, first-failure dominance, p95 latency) in Grafana and point them at the Slack contact point. Save & test.
*   **PII Scrub Test**: Insert a run with an email/phone in `steps.input`. Verify masked in DB / UI.
*   **RBAC Spot Check**: Ensure non-admin role can see Summary but not raw steps.
*   **CI Lanes Green**: Both normal lane (chaos OFF) and robust lane (chaos ON) pass thresholds.

## 3. One-Button Smoke Tests

These tests verify the entire evaluation loop from eval execution to metrics and alerting.

### A) End-to-end “Green Path”

```bash
export CHAOS_ON=0 JUDGE_MODE=llm
python -m evals.agentic.cli --runbook r1_rapid_attribution --cases evals/agentic/fixtures/r1/cases.jsonl
```
*   **Expected Outcome**: Pass-rate ≥ threshold, Prometheus shows increased pass counters.

### B) Force a Regression → Trigger Slack Alert

```bash
export CHAOS_ON=1 CHAOS_TOOL_FAIL_PCT=0.25 CHAOS_SEED=42
python -m evals.agentic.cli --runbook r1_rapid_attribution --cases evals/agentic/fixtures/r1/cases.jsonl
```
*   **Expected Outcome**: In Grafana, the pass-rate panel dips; an alert should fire to Slack within the evaluation window.

### C) New Top-1 First Failure At

```bash
export CHAOS_ON=1 CHAOS_SCHEMA_MANGLE_PCT=0.3
python -m evals.agentic.cli --runbook r1_rapid_attribution --cases evals/agentic/fixtures/r1/cases.jsonl
```
*   **Expected Outcome**: Verify the First Failure Pareto shifts in Grafana and the dominance alert triggers.

## 4. Alerts & Troubleshooting

### When Slack fires “pass-rate < 90%”:

1.  **Open Grafana** → Navigate to the "Agentic Evals" dashboard.
2.  **Focus on First Failure Pareto** for the workflow that triggered the alert. Identify the top failing step.
3.  **Drill into Failing Step**: Check "recent changes" (Prometheus annotation from CI) related to that step.
4.  **Re-run CLI Locally**:
    *   Identify a failing `input_id` from the Grafana dashboard or logs.
    *   Activate your virtual environment.
    *   Run the CLI for that specific case with chaos off:
        ```bash
        CHAOS_ON=0 python -m evals.agentic.cli --runbook <workflow_name> --cases <path_to_single_case_jsonl>
        ```
        (You might need to create a temporary `.jsonl` file with just the failing case.)
5.  **If judge-related**: If the issue points to the judge, toggle the hybrid judge to human-only via environment variable for a specific evaluation run:
    ```bash
    JUDGE_MODE=human python -m evals.agentic.cli ...
    ```
6.  **File a hotfix PR** or roll back the runbook prompt/tool pinned version.

### PromQL for Grafana Alert Rules

*   **Pass-rate drop >10% (24h window)**:
    ```promql
    sum(increase(agent_eval_pass_total[24h])) 
    / clamp_min(sum(increase(agent_eval_pass_total[24h])) + sum(increase(agent_eval_fail_total[24h])), 1)
    < 0.90
    ```
*   **New top-1 first_failure persists >3h**:
    ```promql
    topk(1, sum(increase(agent_eval_first_failure[3h])) by (workflow,step_id))
    / 
    topk(2, sum(increase(agent_eval_first_failure[3h])) by (workflow,step_id))
    < 0.50
    ```
*   **p95 latency > SLO**:
    ```promql
    histogram_quantile(0.95, sum(rate(agent_eval_latency_ms_bucket[3h])) by (le, workflow))
    > 25000
    ```

## 5. Key Configuration

### `.env` Variables (for local/dev)

```ini
PG_URL=postgresql+psycopg2://eval:password@localhost:5432/evals_db
SLACK_WEBHOOK=https://hooks.slack.com/services/XXX/YYY/ZZZ
JUDGE_MODE=llm   # llm | human | hybrid
CHAOS_ON=0
```

### Database Setup

*   **Connection String**: Configured in `services/evalsvc/db.py`.
*   **Initialization**: Run `db.init()` once to create the `eval_runs` table.

## 6. Deployment

### FastAPI Service

Run using `uvicorn services.evalsvc.app:app --host 0.0.0.0 --port 8080`.

### CI/CD

*   **Normal Lane**: `.github/workflows/agentic-evals.yml`
*   **Robust Lane**: `.github/workflows/agentic-evals-robust.yml`
*   **Weekly Scheduler**: `.github/workflows/agentic-weekly.yml`

### Kubernetes CronJob (Example)

See `deploy/evalsvc-weekly-cronjob.yaml` for an example Kubernetes CronJob definition.

## 7. Data Hygiene & Privacy Policy

*   **PII Masking**: Emails, phones, tokens, SSNs, IPs are masked in `steps.input/output` before persistence.
*   **Data Retention**: Raw `steps` JSON is deleted after 90 days; aggregate rows are kept indefinitely. (Implemented via `ops/retention.sql` and a scheduled job).
*   **Access Control (RBAC)**: Only `role:agentic-admin` can query raw steps; other roles (e.g., `analyst`, `viewer`) are restricted to summaries.

## 8. Determinism Controls

*   **LLM Temperature**: Ensure `temperature=0.0` (or nearest minimum) for LLM calls in evaluation runs.
*   **Chaos Seed**: Use `CHAOS_SEED` environment variable for reproducible chaos runs.

## 9. Rollback Plan

Refer to `ops/ROLLBACK.md` for detailed steps on how to roll back the system in case of issues.

## 10. Suggested SLOs (Initial Baselines)

*   **R1 Rapid Attribution**:
    *   Pass-rate: ≥ 90% (over a 24-hour window)
    *   P95 Latency: ≤ 20 seconds
    *   Average Cost: ≤ $0.08/task
*   **R3 Disinfo Mapping**:
    *   Pass-rate: ≥ 85% (over a 24-hour window)
    *   P95 Latency: ≤ 30 seconds
    *   Average Cost: ≤ $0.12/task

*Note: These are initial baselines. Tune them after two weeks of collecting real-world data.*