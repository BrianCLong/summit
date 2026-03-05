# Plan Stability Gate

**Goal:** keep GA safe from accidental Cypher plan changes.

**How it works**
- **Sampling:** 0.5–1% globally (`PLAN_SAMPLING_RATE`), plus 10% for top 20 critical queries via `plan_sampler_config.yml`.
- **Triggers:** sudden p95 latency ≥ configured threshold or error rate ≥ 1% → immediate `PROFILE` sample.
- **Fingerprint:** SHA256 over **operator identity + planner args + tree shape**; strips dynamic stats (rows, db_hits, timing).
- **CI Gate:** fail if per‑query `plan_consistency < 95%`, `new_plan_frequency > 1%`, plan‑entropy ↑ >10% vs baseline, or median latency regression with a new plan > +20%.

**Rollbacks**
- Toggle off quickly: `PLAN_SAMPLER_ENABLED=false`.
- Revert instrumentation commit if needed.
- Apply emergency planner hint (`CYPHER planner=cost`) or index hints to restore prior shape while triaging.

**Artifacts**
- `.plan-samples/*.jsonl` (rolling samples)
- `plan-heatmap.html` (inline SVG)
- ASCII mini‑heatmap in CI logs
