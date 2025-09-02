# Evaluation Policy

This document outlines the policy for evaluating and benchmarking models and routing configurations within the Maestro platform. The goal is to ensure consistent quality, prevent regressions, and provide data-driven insights for continuous improvement.

## 1. Purpose

- To establish a repeatable and transparent process for evaluating model performance and router behavior.
- To prevent regressions in quality, latency, and cost for critical user journeys.
- To provide objective data for proposing and approving changes to model routing weights and policies.
- To ensure compliance with performance and cost Service Level Objectives (SLOs).

## 2. Evaluation Harness

The Maestro Evaluation Harness is an offline system designed to run golden tasks against candidate models and routing configurations. It consists of:

- **Golden Datasets**: Curated datasets (`GOLDEN/datasets/*.jsonl`) with predefined inputs, expected outputs, and scoring hints.
- **Runners**: Python (`eval/runner.py`) and TypeScript (`eval/runner.ts`) scripts to execute evaluation tasks.
- **Scorers**: Modules to compute metrics such as exact match, F1-score, ROUGE-L, and semantic similarity.
- **Metric Capture**: Automatic capture of latency (p95), cost per item, and error rates.

## 3. Evaluation Schedule and Triggers

Evaluations are performed on a regular schedule and triggered by specific events:

- **Weekly Nightly Runs**: A full evaluation suite is executed weekly (e.g., every Sunday at 06:00 UTC) to provide a comprehensive baseline and detect long-term trends.
- **Router Change PRs**: A smaller, representative subset of evaluation tasks (fast mode) is executed automatically when a Pull Request (PR) with the `router-change` label is opened or updated. This provides immediate feedback on potential impacts of routing policy changes.

## 4. Reporting and Artifacts

Each evaluation run produces the following artifacts:

- **JSON Report**: A detailed `report.json` containing per-task, per-model metrics (score_mean, latency_p95, cost_per_item, error_rate, etc.). Stored in `reports/<date>/report.json`.
- **HTML Summary**: An `HTML` report (`report-<date>.html`) summarizing the results, including deltas against the previous successful run. This provides a quick visual overview of changes.
- **WORM Storage**: All evaluation artifacts are uploaded to a Write Once, Read Many (WORM) S3 bucket (`evidence/eval/<runId>/`) for immutability and auditability.

## 5. Acceptance Thresholds and Gating

Changes to routing weights or policies are subject to strict gating based on evaluation results:

- **PR Gating**: Pull Requests that modify routing weights or policies (`router/weights.yaml`, `policy/**/*.yaml`) must attach a successful evaluation report.
- **Thresholds**: Automated CI checks verify that:
  - **Quality**: `mean_score` for critical tasks does not regress by more than [e.g., 1%].
  - **Latency**: `p95_latency_ms` for critical tasks does not increase by more than [e.g., 5%].
  - **Cost**: `mean_cost_per_item_usd` does not increase by more than [e.g., 2%].
  - **Error Rate**: `error_rate` remains below [e.g., 0.5%].
- **Manual Review**: All proposed changes to routing weights/policies require manual review by the Platform and ML Ops teams, with the evaluation report serving as key evidence.

## 6. Dataset Governance

- **Version Control**: Golden datasets are version-controlled alongside the code.
- **Regular Review**: Datasets are reviewed and updated periodically to ensure relevance and coverage of real-world scenarios.
- **PII Handling**: Datasets are sanitized to remove PII or sensitive information.

## 7. Test Scaling

- **Fast Mode**: For PR-triggered evaluations, a smaller, representative subset of the golden datasets is used to provide quick feedback.
- **Full Mode**: Weekly nightly runs utilize the full golden datasets for comprehensive evaluation.

## 8. Continuous Improvement

- Evaluation results are regularly reviewed to identify opportunities for model optimization, router improvements, and dataset expansion.
- Feedback from production incidents is incorporated into new evaluation tasks and datasets.
