# Maestro v1 Review Checklist & Release Gate

Use this to formally accept v1 against the PRD. All items must be ✅ before production cutover.

## A. Functional (F1–F7)

- [ ] **F1 Agent Graphs**: Planner/Executor, Debate, Critique‑Improve patterns delivered; state persistence; resume ≤ 1 step; HITL approve/edit/block with p95 < 250ms.
- [ ] **F2 Model Routing**: Objectives (quality, p95, $/1k, reliability, sovereignty); content tags; fallbacks + circuit‑breakers; **routing pins** with policy explain + audit note.
- [ ] **F3 EvalOps**: Golden tasks; A/B/C prompt tests; scorecards (accuracy, hallucination, tool success, cost); autonomy gate wired to scorecards + SLO burn forecast.
- [ ] **F4 Serving Lane**: vLLM + Ray Serve; continuous batching; KV reuse; spillover to Router; telemetry for queue depth, batch size, KV hit, p50/p95.
- [ ] **F5 Progressive Delivery**: Canary with analysis templates (scorecards+SLO); auto‑rollback; change freeze windows; dual‑control for autonomy > L3.
- [ ] **F6 Evidence‑First UI**: DAG with retries/compensation; Timeline; node‑filtered logs; Artifacts; CI annotations; Compare prev + Graph diff; Routing Studio; Pipelines Validate/Explain; Secrets status/test; Obs embeds.
- [ ] **F7 API/Gateway**: `/runs/*`, `/routing/*`, `/policies/explain`, `/pipelines/:id/validate`, `/providers/*`, `/ci/annotations` meet contracts.

## B. SLOs/Non‑Functional

- [ ] Router decision < **50ms p95** in‑cluster (load test evidence attached)
- [ ] Throughput **≥ 2.5×** baseline; cost/request **≥ −20%**
- [ ] Brownout fallback success **> 98%** (chaos runbook & results attached)
- [ ] Scorecard quality **≥ +5%**; hallucination **≤ 1.0%** (eval report linked)
- [ ] MTTR auto‑rollback **< 2 min** (drill evidence); canary time **−30%**
- [ ] 99.9% control plane availability; 99.95% read APIs (SLO dashboards linked)

## C. Security, Policy, Compliance

- [ ] OPA/Rego bundles for routing, cost, autonomy; default‑deny unknown tags
- [ ] Data residency/jurisdiction tags enforced; audit trail end‑to‑end
- [ ] SBOM + Cosign for deployable artifacts; provenance entries verified

## D. Observability & Ops

- [ ] OTEL traces/metrics/logs normalized; dashboards render OOTB
- [ ] Alert rules for error budget & backpressure to Slack; runbooks linked
- [ ] Kill‑switch tested; freeze windows documented; dual‑control observed

## E. Accessibility

- [ ] WCAG 2.2 AA pass on core flows; focus trap/ARIA & keyboard coverage
- [ ] Dev‑only axe toggle enabled; a11y issues triaged/resolved

## Sign‑off

- Product ✅ **\*\***\_\_**\*\*** Date: \_\_\_\_
- Platform Eng ✅ \***\*\_\_\*\*** Date: \_\_\_\_
- Security/Compliance ✅ \_**\_ Date: \_\_**
- SRE ✅ **\*\*\*\***\_\_\_**\*\*\*\*** Date: \_\_\_\_
