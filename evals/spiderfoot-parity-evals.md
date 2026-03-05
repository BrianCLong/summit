# Evals Plan: SpiderFoot Parity & Proof Moat

## 1. Metrics Schema (`metrics.json`)

```json
{
  "time_to_first_answer_ms": "number",
  "actionability_rate": "number (0.0 to 1.0)",
  "reproducibility_hash_match_rate": "number (0.0 to 1.0)",
  "false_positive_burden_minutes_p50": "number",
  "coverage_sources_count": "number",
  "modules_executed_count": "number",
  "provable_actionability_index": "number (0.0 to 1.0)"
}
```

## 2. Fixture Datasets (Offline & Deterministic)

Located in `evals/fixtures/`:

*   `osint_entities.json`: A static list of domains, IPs, and emails with known historical records for testing collector coverage.
*   `vuln_cves.json`: A list of CVEs with pre-defined "urgent" and "benign" labels based on historical CISA KEV data.
*   `brand_typosquats.json`: A list of typosquat domains with associated screenshots and DNS records, labeled as "abuse" or "parked".

## 3. PR Eval Requirements

*   **PR-01 (Evidence Bundle):** `reproducibility_eval.ts`. Threshold: `reproducibility_hash_match_rate` = 1.0.
*   **PR-02 (Module SDK + Runner):** `time_to_first_answer_eval.ts`. Threshold: `time_to_first_answer_ms` < 5000ms.
*   **PR-03 (Pipeline Engine):** `drift_detection_eval.ts`. Threshold: 100% accuracy on known diffs.
*   **PR-04 (Graph Model):** `entity_resolution_eval.ts`. Threshold: > 95% precision on `osint_entities.json`.
*   **PR-05 (Correlation Rules):** `correlation_utility_eval.ts`. Threshold: `false_positive_burden_minutes_p50` < 15 mins.
*   **PR-06 (Case-first UX):** `minutes_to_triage_sim.ts` (Playwright). Threshold: Simulated workflow completes in < 3 minutes.
*   **PR-07 (Integrations Center):** `actionability_eval.ts`. Threshold: `actionability_rate` > 0.8.
*   **PR-08 (Vuln Module):** `vuln_scoring_eval.ts`. Threshold: High correlation with "urgent" labels in fixture.
*   **PR-09 (Brand Module):** `brand_detection_eval.ts`. Threshold: > 90% precision on typosquat detection.

## 4. Determinism Harness

The CI pipeline (`ci/determinism.yml`) executes the pipeline twice using the `evals/fixtures/` datasets. It then compares the resulting `report.json`, `metrics.json`, and `stamp.json` files. If they are not byte-identical, the build fails. All random seeds and timestamps within the pipeline must be fixed or mocked during fixture runs to isolate nondeterminism.
