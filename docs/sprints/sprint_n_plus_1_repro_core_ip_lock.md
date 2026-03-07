# Sprint N+1 — Repro Core + IP Lock

**Mission/Theme:** Deliver a provenance-first, benchmarked retrieval + reasoning reference pipeline for IntelGraph that is patent-ready and integration-ready, with a differentiable moat feature gated behind a flag (`--method=baseline|novel`).

## Objectives

- Ship a running, reproducible reference pipeline with pinned dependencies and telemetry hooks.
- Establish baselines and a flagged moat candidate that demonstrates measurable deltas.
- Produce patent scaffolding (claims, prior art, FTO) tied directly to implemented flags.
- Provide a callable integration stub for Summit/IntelGraph/MC with structured logs and metrics.

## Scope & Non-goals

- **In scope:** reference Python 3.11 pipeline, CLI + FastAPI wrapper, synthetic fallback data loader, benchmarking harness, IP artifacts, compliance inventory, OpenTelemetry/Prometheus counters.
- **Out of scope:** full production hardening, multi-tenant auth, extensive UI polish, non-approved GPL/AGPL deps.

## KPIs (North Star Eval Card)

- **Quality:** task accuracy / F1 (per selected dataset), determinism seed test success.
- **Latency:** p50/p95 end-to-end latency per request.
- **Cost proxy:** tokens processed or CPU seconds per query.
- **Reliability:** `make bootstrap && make test && make run` green on fresh machine.

## Baselines & Moat Candidate

- **Baseline 1 (commitment):** simple heuristic pipeline (e.g., BM25 retrieval + lightweight re-ranker).
- **Baseline 2 (stretch):** standard strong baseline (e.g., dense retriever + cross-encoder re-rank).
- **Moat candidate (flagged):** provenance-weighted retrieval + reasoning path with deterministic hashing and hybrid scoring. Exposed via `--method=novel`; feature is optional and must fall back cleanly.

## Workstreams & Deliverables

1. **Product/PMO:** Sprint charter, benchmark slice (1–2 datasets), minimal integration API endpoint, unambiguous KPIs.
2. **Research/SCOUT:** Novelty matrix vs. 5–10 closest prior art; moat hypotheses with knob/flag, expected delta, failure modes; attack/defense vectors.
3. **Architecture/ARCHITECT:** `/spec/` method spec (symbols, pseudocode, complexity), API contracts for `fit()/infer()/eval()`, telemetry schema, provenance hooks (inputs/transforms/outputs/hashes).
4. **Engineering/IMPL:** `/impl/` clean-room Python reference with CLI; `make bootstrap && make test && make run`; synthetic data loader; method flagging; logging/metrics/config scaffolding.
5. **Experiments/EXPERIMENTALIST:** `/experiments/` grid configs + seeded runs; `/benchmark/` harness with metrics + summary table; ablation plan (≥1); JSONL traces and aggregated report; latency/cost reporting.
6. **IP/PATENT-COUNSEL:** `/ip/draft_spec.md`, `/ip/claims.md` (≥2 independent + ≥8 dependent), `/ip/prior_art.csv`, `/ip/fto.md`; claims map to flags/spec; inventorship log tied to commits.
7. **Compliance/Security:** `/compliance/` third-party inventory + licenses; SPDX/SBOM generation step; data governance note (sources, PII handling, retention); redaction/PII scanning hook stub.
8. **Integration/Platform:** `/integration/` SDK stub + example call; FastAPI service wrapper + container recipe; structured logs; OpenTelemetry/Prometheus metrics endpoint.
9. **Commercialization:** `/go/brief.md` partner brief; two vertical targets + ROI story; defensibility bullets aligned to claims; pricing hypothesis.

## Acceptance Criteria (DoD)

- `make bootstrap && make test && make run` pass on a fresh machine with pinned deps.
- Baseline reproduced within tolerance; novel flag shows measurable delta or documented null.
- Seeds documented; configs committed; eval report generated and versioned.
- Patent scaffold complete (claims, prior art, FTO) and traceable to implemented flags/spec.
- Integration stub callable with telemetry; structured logs and metrics endpoint exposed.
- Compliance artifacts present; no GPL/AGPL unless pre-approved; dataset rights documented.

## Timeline & Ceremonies

- **Day 1:** Kickoff + benchmark lock (45m).
- **Daily:** 10m standup with blockers + artifact check.
- **Day 5:** Mid-sprint demo (baseline runs + early IP claims).
- **Day 10:** Demo + retro; ship/no-ship gate on DoD.

## Risks & Mitigations

- **Risk:** Novel feature regressions or non-differentiable gains. **Mitigation:** keep fallback baseline path; log deltas with seeds; document null results.
- **Risk:** IP contamination. **Mitigation:** clean-room implementation; license inventory; prior-art table with deltas and licenses.
- **Risk:** Dependency drift. **Mitigation:** pin versions; bootstrap target in CI; SBOM generation step.
- **Risk:** Integration blockers. **Mitigation:** stubbed FastAPI + SDK call with contracts early; add telemetry schema upfront.

## Next Actions (immediately actionable)

- Lock benchmark datasets and success thresholds; create initial `/spec/` draft with provenance hooks.
- Scaffold `/impl/` with CLI + config; add synthetic dataset loader; add `--method` flag wiring.
- Prepare `/experiments/` configs for baseline + novel flag; set seeds and logging format (JSONL traces).
- Draft `/ip/` artifacts aligned to spec; start inventorship log tied to commits.
- Add `/integration/` FastAPI stub + example client call; wire OpenTelemetry/Prometheus counters.
- Add `/compliance/` inventory template and SBOM generation step in CI stub.
- Draft `/go/brief.md` with two target verticals and pricing hypothesis.
