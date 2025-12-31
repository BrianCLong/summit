# Evaluation Gates for Learning Artifacts

Evaluation gates prevent regressions, bias creep, cost overruns, and policy violations. No artifact advances without passing these gates with recorded evidence.

## Standard Evaluation Criteria

- **Utility/Accuracy**: Task-specific metrics (e.g., precision/recall/F1, NDCG/MRR for ranking, BLEU/BERTScore for generation). Require statistically significant improvements over the currently active version.
- **Calibration & Robustness**: Expected calibration error, confidence coverage, variance across seeds; deterministic decoding paths documented.
- **Bias & Safety**: Demographic parity tests where applicable, toxic/harmful content filters, red-team prompts, and policy conformance scans.
- **Cost & Performance**: Latency (p50/p95), throughput, memory envelope, and unit cost per request; headroom targets defined per deployment tier.
- **Policy Adherence**: Alignment with `docs/governance/RULEBOOK.md`, refusal policies, and provenance requirements. Any violation is a hard block.

## Change Gates

- **Minimum Improvement Thresholds**: Net utility uplift ≥ defined baseline (default: +2% relative improvement or maintaining utility with ≥5% cost reduction). Document deviations with rationale and owner approval.
- **Regression Blockers**: No statistically significant regression on primary metrics; zero P0/P1 safety violations; no new data/license issues.
- **Human Approval**: Action-eligible artifacts require explicit owner + deputy sign-off before promotion to `approved` or `active`.
- **Reproducibility**: Runs must specify dataset versions, seeds, hyperparameters, and checkpoints; attach logs to provenance.

## Evidence Bundle

Include in provenance for each promotion:

1. Evaluation report (metrics table and comparisons to prior version).
2. Bias/safety results and red-team prompts with outcomes.
3. Cost/performance profile with observed vs. target budgets.
4. Runbook link for deployment, rollback point, and alerting configuration.

## CI Change Verification (`verify-learning-change`)

A dedicated CI job enforces presence of governance assets and scripts. The job executes `scripts/ci/verify-learning-change.sh` to verify:

- Required governance documents exist and contain expected headers.
- Promotion/rollback scripts are present and executable.
- Governance cadence and lifecycle docs are available for reviewers.

CI must block promotion or deployment if the script reports missing artifacts or non-compliance.
