# Workstream 1 RACI – Releases 1 & 2

| Milestone | Week | Release | Key Deliverables | Dependencies (WS2-WS8) | Dev | Sec | SRE | Data | Docs | Evidence Hooks |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| M1. Guardrail telemetry charter (ST-WS1-001A) | Week 1 | R1 | Publish latency SLO contracts and owner table. | WS2 data API schema; WS3 knowledge graph plan; WS5 observability dashboards. | R | C | A | C | I | `telemetry-blueprint.log`, Grafana snapshot, `scripts/validate_slo_schema.js` report |
| M2. Cost instrumentation spec (ST-WS1-001B) | Week 1 | R1 | Define cost data sources, 80% alert routing. | WS6 FinOps automation; WS8 compliance audit inputs. | R | C | C | A | I | `cost-guardrails.log`, PagerDuty webhook receipts, mock billing test results |
| M3. Backlog schema & lint automation (ST-WS1-002A) | Week 2 | R1 | Checked-in backlog/backlog.json and validation script. | WS7 CI/CD governance; WS8 audit registry. | R | I | C | C | A | `lint-backlog.log`, CI lint artifact, provenance commit |
| M4. RACI publication & governance alignment (ST-WS1-002B) | Week 2 | R1 | docs/raci.md published with dependencies to WS2-WS8. | WS8 governance charter | C | C | I | I | R | `raci-publication.log`, markdown lint report, approval notes |
| M5. Synthetic guardrail checks live (ST-WS1-003A) | Week 3 | R2 | GitHub workflow validating latency/cost guardrails weekly. | WS4 platform runtime readiness; WS5 observability modules. | R | I | A | C | C | `synthetic-guardrail-check.log`, workflow run artifact, Slack notification export |
| M6. Release provenance log (ST-WS1-003B) | Week 4 | R2 | Provenance template + tag verification integrated with RACI sign-offs. | WS7 release automation; WS8 compliance evidence. | C | A | C | I | R | `release-provenance.log`, security review artifact, tag verification script output |

**RACI Legend:** R = Responsible, A = Accountable, C = Consulted, I = Informed.

## Timeline Notes
- Weekly cadence aligns with trunk-based development; staging cuts every Friday (Weeks 1 & 3) and production pushes on even weeks (Weeks 2 & 4).
- Release 1 sign-off requires M1–M4 evidence hooks attached in provenance register before tag `v24.1.0`.
- Release 2 sign-off requires M5–M6 evidence with guardrail synthetic results and compliance approvals prior to tag `v24.2.0`.

## Evidence & Provenance Expectations
- **Logs:** Upload log artifacts to `runs/workstream-1/` with milestone identifier (e.g., `runs/workstream-1/m5-synthetic.log`).
- **Metrics:** Snapshot Grafana dashboards and cost reports; link export URLs in backlog evidence arrays.
- **Tests:** Capture CI run URLs for `npm run lint:backlog`, `npm run test:alerts`, and synthetic workflows.
- **Provenance:** Update `provenance/release-log.md` with milestone references, signatories, and tag mapping per Definition of Done.

## Coordination Rhythm
- Monday sync with Workstreams 2–8 to confirm dependency readiness.
- Wednesday checkpoint with SRE/Data for telemetry validation.
- Thursday documentation review with Docs + Sec for compliance adjustments before staging cut.
