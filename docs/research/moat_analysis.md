# Moat Pipeline Analysis and Design-Around Resistance

## Goals

- Preserve moat strength while enabling rapid iteration between evaluation variants (v1 vs v1b).
- Provide measurable guardrails by comparing variant performance against a defined baseline.
- Centralize flags and observability so policy, risk, and engineering stakeholders can reason about variant drift.

## Configuration Strategy

- **Single source of truth:** `config/moat.yaml` declares the managed pipeline, allowed versions, the active default, and the baseline used for comparative reporting.
- **Safe toggles:** The runner reads the config and automatically injects the resolved `variant` into the execution context; callers can still override via `context.variant` or `context.moat_version` when running bespoke experiments.
- **Shared store:** All runs publish metrics to a shared JSON store (`pipelines/demo/moat-metrics.json` by default) so that downstream analytics and dashboards can consume consistent records.

## Comparative Instrumentation

- **Baseline anchoring:** For any run that is not on the baseline version, the runner queries the latest baseline record and computes deltas for latency (`duration_ms`) and task success rate.
- **Opt-in surface:** Instrumentation only activates for the configured Moat pipeline name, ensuring other pipelines stay untouched.
- **Drift signals:** The stored payload captures the active version, the baseline version, success/failure counts, and calculated deltas to expose regressions quickly.

## Design-Around Resistance

- **Flag hygiene:** By constraining valid versions to the allowlist in `config/moat.yaml`, unreviewed variants cannot execute silently, reducing the attack surface for untracked experiment forks.
- **Traceable runs:** Run records include timestamps, run IDs, and variant tags so auditors can reconstruct lineage across variant switches.
- **Comparative guardrails:** Automated deltas make it harder to accept variants that degrade the moat (e.g., higher latency or lower success rate) without explicit acknowledgement in downstream reviews.
- **Extensible metrics:** The comparative metric list is configurable, enabling additional signals (e.g., cost-per-run) to be enforced without code changes.

## Next Steps

- Wire the shared metrics store into dashboarding (Superset/Looker) for trend visualizations.
- Add alerting thresholds on comparative deltas to block promotions when performance regresses.
- Extend the allowlist to include staged "canary" variants with capped concurrency for higher-safety rollouts.
