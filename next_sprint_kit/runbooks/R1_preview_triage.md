# R1 Runbook — Preview Latency & Accuracy Triage

## Purpose
Stabilize NL→Cypher preview when latency or accuracy drifts during demos.

## Preconditions
- Demo data generated via `scripts/generate_demo_data.py --seed 42`.
- Grafana dashboard JSON exported and linked in ops/slo_dashboards.md.

## KPIs
- Preview P95 latency < 850 ms.
- Accuracy ≥95% on curated fixture set.
- Guardrail block rate <5% of total requests (exclude malicious tests).

## Steps
1. **Verify fixtures:** `python scripts/generate_demo_data.py --seed 42 --verify` and confirm checksum matches runbook note.
2. **Check dashboards:** Open tri-pane dashboard; confirm error budget not burning faster than 1%/hr.
3. **Profile requests:** Enable tracing header `x-trace-debug: true` and capture top slow spans.
4. **Policy drift check:** Run contract tests for authority compiler; compare policy version to expected in sprint_goal.md.
5. **Mitigation:**
   - Increase cache TTL for policy registry to 5 minutes if misses >30%.
   - Reduce candidate count to top-2 if CPU saturation >80%.
   - Block unsafe predicates automatically and return explainability message.
6. **Validation:** Re-run curated prompts and record KPIs in `R2_resilience_demo.md` appendix.

## Failure Modes & XAI Notes
- **Wrong candidate selected:** Provide `Explain this view` output showing policy rationale; attach to incident record.
- **Guardrail false positive:** Capture payload, policy ID, and decision reason; switch to advisory mode with governance approval.
- **Latency spikes from Neo4j:** Note if explainability cites schema expansion; enable depth limit to 2 temporarily.
