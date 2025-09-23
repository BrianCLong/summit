# IntelGraph Assistant v1.1 — Roadmap

## Vision & Goals

- Raise trust: grounded-by-default answers with visible, actionable provenance.
- Improve control: per-tenant model routing with audit trails and dry-run validation.
- Boost analyst impact: inline citation highlighting + guided export playbooks.
- Harden quality: mutation testing on critical paths; perf budgets with backoff tuning.
- Reduce toil: clearer SLO dashboards; canary metrics driving rollouts.

## Key Themes

### Per-Tenant Model Routing
- UI + policy to choose model tier/transport/safety; audited changes, dry-run diffs.

### Inline Citation Highlighting
- Token-level spans (graph/doc provenance), hover details, keyboard nav, click→pivot.

### Dataset Export Playbooks
- Wizard + templates to export cited subgraphs & docs with a provenance bundle (NDJSON + Graph).

### Quality Hardening
- Mutation testing (Stryker) on transports, ABAC, coalescer; k6 perf profiles; flaky test scrub.

## Deliverables

- Routing UI (Admin Console panel), policy engine integration, audit log, dry-run validator.
- Citation UX: DOM range spans, color-by-source, a11y pass, GraphQL `citations(answerId)` pivot wired.
- Export Playbooks: schema + wizard, saved templates, reproducible bundle (subgraph + docs + manifest).
- Test/Perf: mutation suite on critical paths; k6 backoff/resilience harness; perf budgets enforced in CI.

## Milestones & Timeline (6 weeks)

| Week | Scope |
| --- | --- |
| W1–2 | Routing UI MVP, policy schema, dry-run validator; citation rendering spike; export schema + manifest. |
| W3–4 | Routing audit trail + revert; citation UX polish (hover/keyboard) + graph pivot; playbooks E2E (save/run). |
| W5 | Mutation tests (transports/ABAC/coalescer), k6 perf profiles & budgets, flaky test scrub, docs. |
| W6 | Canary + polish; a11y checks; dashboards; release prep & migration notes. |

## Quality Gates & Metrics

- Grounding rate: ≥ 80% when RAG=ON (nightly); “cannot confirm” ≤ 10% @ P50.
- ERv2 precision: ≥ 0.92 on nightly eval; auto-link FP ≤ 5%.
- Perf: p95 TTFB < 450 ms, p95 complete < 2.3 s, errors < 1%/tenant (5m).
- Mutation score: ≥ 70% on transports/ABAC/coalescer; unit coverage ≥ 85% changed code.
- A11y: citation spans pass axe smoke; keyboard nav covers all cite items.

## Flags & Rollout

- Flags: `ROUTING_UI`, `INLINE_CITES`, `EXPORT_PLAYBOOKS`, `ER_V2_RAMP`.
- Canary: 5% → 25% → 100% gated by SLOs (TTFB, errors, grounding rate).
- Kill switches: per-tenant policy revert; transport/model fallback.

## Observability & Ops

- Dashboards: grounding rate, cite clicks→pivot, routing decisions by policy, export success/time, backoff retries.
- Alerts: error spikes, degraded p95, ERv2 precision dips, export failures, routing misconfig (dry-run diff mismatch).

## Risks & Mitigations

- DOM perf (spans): chunked render + virtualization; cap tokens; offload long transcripts.
- Policy misroutes: dry-run validator + audit trail + one-click revert.
- Export size/PII: template whitelists; size guardrails; provenance bundle mandatory.
- Test flakiness: strict real-timer usage for userEvent; fuzz framing continues in nightly.

## Dependencies

- Hardened `citations(answerId)` resolver; Admin policy storage; export bundler finalized (NDJSON + Graph + manifest).
- Nightly services lane remains the coverage/perf gate.

## Acceptance Criteria

- Tenants can set routing policy; changes are audited and dry-run-validated before apply.
- Inline cites render with hover + keyboard; clicking pivots to cited graph nodes.
- A saved playbook produces a reproducible export bundle with provenance manifest.
- Mutation score ≥ 70% on targets; k6 perf within budgets; no new flaky tests.

## Work Breakdown (high level)

- **Routing UI/Policy**: schema, UI panel, dry-run, apply, audit, revert, tests.
- **Citation UX**: token provenance mapper, span renderer, a11y, pivot wiring, tests.
- **Playbooks**: schema, wizard, storage, runner, bundler, tests.
- **Quality**: Stryker config + survivors triage, k6 profiles, budgets in CI, docs.

## Rollout Gates (promote when all true)

- Grounding rate ≥ target; ERv2 precision ≥ target; p95s within budget; zero critical alerts 48h; nightly coverage OK.

## Next Steps (this week)

- Land policy schema + Routing UI MVP behind `ROUTING_UI`.
- Implement citation span renderer (read-only) + a11y smoke tests.
- Define export manifest (graph + docs + checksums) and stub the bundler.
- Add Stryker config targeting transports/ABAC/coalescer; wire to nightly.

## Revised Prompt (to kick off v1.1)

“Implement Per-Tenant Model Routing (UI, policy, dry-run, audit), Inline Citation Highlighting (token spans with hover/keyboard and pivot), and Export Playbooks (schema, wizard, reproducible bundle). Add mutation testing on transports/ABAC/coalescer and k6 perf budgets. Roll out behind flags with canary gates and dashboards.”
