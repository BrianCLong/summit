# Daily CI/CD Observability Brief — 2026-02-06

**Mode:** Reasoning (analysis-focused, evidence-first)

## Evidence Bundle (UEF)

**Primary sources (user-provided):**

1. GitHub Actions metrics concepts (DORA / performance / queue time)
   - https://docs.github.com/en/actions/concepts/metrics
2. OpsMx DORA dashboards via CloudEvents
   - https://www.opsmx.com/blog/optimizing-ci-cd-performance-with-comprehensive-dora-metrics/
3. Flaky tests detection action (Staffbase)
   - https://github.com/Staffbase/github-action-find-flaky-tests
4. GitHub cache action (`cache-hit` output)
   - https://github.com/actions/cache
5. Failure clustering (Omni/TestVagrant)
   - https://omni.testvagrant.ai/blog/smart-failure-clusters-reduce-analysis-time-70-percent

**Summit Readiness Assertion:**
- See `docs/SUMMIT_READINESS_ASSERTION.md` for readiness posture and enforcement baseline.

## Present-State Assertions (what changed)

1. GitHub Actions now exposes first-class concepts for workflow performance and queue time measurement, aligning with DORA-style outcomes.
2. DORA aggregation is converging on standardized event models (e.g., CloudEvents) and centralized dashboards.
3. Flaky test detection is productionized as a reusable GitHub Action that scans run history and reports instability.
4. Cache hit-rate is measurable via `actions/cache` outputs, enabling hard governance thresholds.
5. Failure clustering is emerging as a workflow primitive to compress triage time while preserving privacy via fingerprinting.

## Future-State Dictates (Summit posture)

**Objective:** CI governance that is measurable, enforceable, and replayable.

### Integration posture
- **Integrate:** GitHub-native metrics, Staffbase flaky action (or equivalent), `actions/cache` hit reporting, queue-time polling, and a failure clustering prototype.
- **Compete:** Summit-grade governance layers: deterministic evidence, policy-as-code gates, multi-repo rollups, privacy-safe failure fingerprints, and replayable CI incidents.

### Evidence-first outputs (required artifacts)
- `evidence/report.json`: run metadata, timings, queue time, cache-hit, flaky summary, failure fingerprints
- `evidence/metrics.json`: DORA rollups, cache hit-rate, flake %, queue p95, cluster counts
- `evidence/stamp.json`: evidence ID, schema version, git SHA, lock hash, config hash, optional signature

**Evidence ID pattern:**
`EVID::cicd::<yyyy-mm-dd>::<repo>::<workflow>::<gitsha8>::<runid8>`

### Determinism rules
- Canonical JSON with sorted keys and stable list ordering.
- Fingerprinting normalization must be stable for identical log input.

## Risk Register (governed exceptions only)

1. **Metric ambiguity** across tools can mislead gates. Remediation: normalize schema and enforce at ingestion.
2. **Flaky detection false positives** can cause alert fatigue. Remediation: thresholded quarantine with expiry.
3. **Cache metrics gaming** can mask correctness regressions. Remediation: pair with determinism checks.
4. **Queue-time variance** depends on runner fleet. Remediation: capacity SLOs with alerting.
5. **Failure clustering privacy risk** from log export. Remediation: on-runner hashing + redaction.

## MAESTRO Threat Modeling Alignment

- **MAESTRO Layers:** Foundation, Data, Tools, Infra, Observability, Security
- **Threats Considered:** goal manipulation, prompt injection, tool abuse, metrics tampering, log exfiltration
- **Mitigations:** action pinning by SHA, least-privilege tokens, on-runner redaction + hashing, signed evidence artifacts, policy-as-code gates

## Implementation Sequence (PR-ready stack)

1. **PR1 — Metric schema + evidence kit**
   - `ci-observability/schema/metrics.schema.json`
   - `ci-observability/evidence/write_evidence.ts`
   - Gate: `ci/evidence_required`
   - Eval: `evals/evidence_determinism_test`
   - Docs: `docs/ci/observability-schema.md`

2. **PR2 — Cache hit rate capture**
   - Workflow templates capture `cache-hit`
   - `ci-observability/collectors/cache_hit_collector.ts`
   - Gate: `ci/cache_metrics_present`
   - Eval: `evals/cache_hit_parser_test`
   - Docs: `docs/ci/cache-hit-metrics.md`

3. **PR3 — Queue time collector + alerts**
   - `ci-observability/collectors/queue_time.ts`
   - `ci-observability/alerts/queue_time_alert.ts`
   - Gate: `ci/queue_time_slo`
   - Eval: `evals/queue_time_calc_test`
   - Docs: `docs/ci/queue-time-slo.md`

4. **PR4 — Flaky test detection + quarantine workflow**
   - Staffbase action integration
   - `ci-observability/collectors/flaky_tests.ts`
   - `ci-observability/quarantine/manifest.json`
   - Gate: `ci/flaky_rate_gate`
   - Eval: `evals/flaky_rate_rollup_test`
   - Docs: `docs/ci/flaky-tests-playbook.md`

5. **PR5 — Failure fingerprinting + clustering prototype**
   - `failure-fingerprint/normalize.ts`
   - `ci-observability/clustering/tfidf_cluster.ts`
   - Gate: `ci/no_raw_logs_exported`
   - Eval: `evals/fingerprint_stability_test`
   - Docs: `docs/ci/failure-clustering.md`

6. **PR6 — GitHub Pages dashboard + daily rollup**
   - `dashboard/` static site
   - `ci-observability/rollups/daily.ts`
   - Workflow: `/.github/workflows/ci-metrics-rollup.yml`
   - Gate: `ci/dashboard_build`
   - Eval: `evals/rollup_consistency_test`
   - Docs: `docs/ci/dashboard.md`

## Decision Record (final)

Summit will implement an evidence-first CI observability pipeline that integrates GitHub-native metrics and governed third-party actions, while enforcing privacy-safe failure fingerprinting and policy-as-code gates. This decision is final and authoritative pending execution of PR1–PR6.
