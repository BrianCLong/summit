# IntelGraph IO Resilience Module — Integration Plan (Q4 2025)

This plan wires the IO Resilience playbook into the IntelGraph platform across database schema, GraphQL APIs, detectors, dashboards, Jira workflows, and the customer-facing verification experience.

---

## 1. Deliverables & Ownership

| Area | Deliverable | Owner |
| --- | --- | --- |
| Database | `io_events`, `io_actions`, `io_media`, `io_forecasts`, `io_provenance_assertions` tables + indexes | Security Engineering (Database) |
| GraphQL API | Schema + resolvers for IO events/actions/metrics/forecasts/provenance | Platform GraphQL Squad |
| Detection Services | Domain similarity, synthetic media triage, risk scoring, provenance health | Detection Engineering |
| Dashboards | TTD/TTM, narrative map, takedown tracker, predictive risk, provenance coverage | Intelligence Ops |
| Jira Automation | Automation rules + SLA imports | Program Management |
| Verify Microsite | `/verify` React page with signing keys & debunks | Web Platform |

---

## 2. Implementation Checklist

1. **Database Migration**
   - Apply `server/db/migrations/postgres/2025-09-25_io_resilience.sql` and `server/db/migrations/postgres/2025-10-02_io_resilience_predictive.sql` in dev/stage/prod.
   - Confirm indexes and FK relationships via `\d io_events`, `\d io_forecasts`, and `\d io_provenance_assertions`.
2. **Seed Data**
   - Load `server/db/seeds/postgres/2025-09-25_io_resilience.sql` (dev only) to exercise dashboards and new foresight views.
3. **GraphQL**
   - Register schema via `server/src/graphql/schema/ioResilience.ts` and resolvers via `server/src/graphql/resolvers.ioResilience.ts`.
   - Expose queries: `ioEvents`, `ioEvent`, `ioTTDTTM`, `ioTakedownAging`, `ioClusterRollup`, `ioForecasts`, `ioRiskOutlook`, `ioProvenanceCoverage`.
   - Expose mutations: `createIOEvent`, `createIOAction`, `completeIOAction`, `createIOForecast`, `createIOProvenanceAssertion`.
4. **Services & Utilities**
   - Publish detection utilities under `server/src/services/io/` (domain similarity, synthetic triage, story IDs, risk scoring, provenance ledger).
   - Ensure these services are imported by pipelines (detector workers, evidence processors).
5. **Dashboards**
   - Hook SQL from `docs/io/IO_Resilience_Deployment_Kit.md` into Grafana/Looker panels (TTD/TTM, narrative map, takedown, risk outlook, provenance health).
   - Validate that seeded data renders metrics, forecasts, and provenance warnings.
6. **Jira Automation**
   - Import `ops/jira/io/automation.yaml` and `ops/jira/io/slas.json`.
   - Map custom fields and Slack channel per environment.
7. **Verify Microsite**
   - Deploy `client/src/pages/VerifyUs.tsx`; add navigation entry `/verify`.
   - Publish static fallback `public/verify/index.html` (optional) for non-SPA deployments.
8. **Exercises**
   - Schedule voice-clone and spoofed-domain drills within 30 days to benchmark TTD/TTM.

---

## 3. Metrics & Reporting

- Embed TTD/TTM charts in the executive dashboard (link to Grafana panel IDs).
- Weekly report should include:
- Median TTD/TTM (sev ≥ 4).
- Impersonation dwell time.
- Outstanding takedowns (> 12 hours).
- Narrative clusters with Rₙarr ≥ 1.2.
- Predictive risk scores ≥ 0.85 and provenance health index < 0.4.

---

## 4. Dependencies & Risks

- **Database capacity:** Additional indexes may require vacuum tuning; monitor `pg_stat_all_indexes` after launch.
- **Authentication:** Mutations require `role:intel` or `role:trustsafety`; ensure ABAC rules are updated before deployment.
- **Detector accuracy:** Synthetic media triage stub is a placeholder; schedule upgrade to production models.
- **Jira alignment:** Automation assumes Slack channel `#io-warroom`; adjust for each tenant.
- **Comms readiness:** Communications team must maintain debunk templates and hotline script.

---

## 5. Rollout Timeline

| Week | Milestone |
| --- | --- |
| Week 1 | Apply migration, seed dev, smoke-test GraphQL queries. |
| Week 2 | Publish dashboards + `/verify` page, import Jira automation. |
| Week 3 | Run Exercise A (voice clone) and publish after-action report. |
| Week 4 | Run Exercise B (spoofed media), finalize baseline metrics, hand off to operations. |

---

## 6. Change Control

- Track updates to this document via PRs referencing `docs/io/CHANGELOG.md` (create if absent).
- Require approvals from Security Engineering and Trust & Safety before merging structural changes.
- Capture dashboard/report URLs in `docs/io/README.md` once production links exist.

---

## 7. Follow-up Enhancements

- Integrate embeddings pipeline for automatic Story ID suggestion.
- Expand dataset ingestion to include telephony provider telemetry and predictive risk features.
- Automate Slack/email notifications when SLA thresholds are breached.
- Add provenance verification results to `/verify` page once C2PA manifests are live (now partially surfaced via provenance coverage).
- Evaluate dedicated forecasting models for region-specific risk horizons.

---

**Status:** Initial implementation complete in this commit; see associated PR for detailed diff and future tasks.
