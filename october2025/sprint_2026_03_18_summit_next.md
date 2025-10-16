```markdown
# Sprint Plan — Summit / IntelGraph / Maestro Conductor

**Slug/Version:** `sprint-2026-03-18-intelgraph-summit-v1.11.0`
**Dates:** Mar 18–Apr 1, 2026 (2 weeks)
**Timezone:** America/Denver

> Focus: **Production scale-out + evaluators → outcomes.** Convert second pilot to production, finalize webinar → MQL pipeline, push GraphRAG quality & governance into day‑to‑day workflows (saved queries, report annotations), and extend connectors (ServiceNow incidents + STIX enrichments). Target **$500k new ARR in commit** and **2 concurrently active production tenants**.

---

## 0) North‑Star & Guardrails

- **North‑Star:** 2 production tenants live; webinar sourced ≥ 15 qualified meetings; marketplace leads ≥ 40 total.
- **SLOs:** Availability ≥ 99.8%; Read P95 ≤ 220 ms; Policy P95 ≤ 8 ms; Error budget burn < 10%.
- **Security & Governance:** 0 criticals; SBOM on `v1.11.0`; ER merge audit coverage ≥ 98%; schema approvals enforced for prod tenants.

---

## 1) Objectives (Demo on Apr 1)

1. **Second Conversion Signed:** SOW executed, migration rehearsal complete, day‑2 ops accepted.
2. **Saved Queries & Playbooks:** NL→Cypher templates saved as shareable playbooks with parameters; approval + audit links.
3. **Report Annotations v2:** inline highlights (nodes/edges), comment threads, and provenance marks; export to PDF/MD.
4. **ServiceNow Incident Connector:** one‑way read (incidents, comments, CIs) → graph; provenance; throttling.
5. **Threat Intel v4:** STIX enrichment normalization + dedupe improvements; confidence scoring; budget guardrails.
6. **Webinar → Pipeline:** lead capture → scoring → meeting handoffs; ABM follow‑ups; pilot opportunity creation.
7. **Analytics v4:** funnel + cohort drilldowns; per‑playbook adoption; conversion dashboards for GTM.

---

## 2) Scope & Priority

- **P0 (Must):** Second conversion pack; saved queries/playbooks; report annotations v2; ServiceNow incidents connector; TI v4 normalization; webinar→pipeline ops; analytics v4.
- **P1 (Should):** Saved search ACLs & sharing; export presets; connector health SLOs; audit export automation.
- **P2 (Could):** Simple playbook scheduler; map clustering auto‑binning; SDK snippet generator for playbooks.
- **Won’t:** Payment rails; FedRAMP ATO; active‑active multi‑region.

---

## 3) Swimlanes & Owners

- **Product/GTM (Felix):** Conversion 2, webinar pipeline ops, ABM follow‑ups, conversion dashboards.
- **Frontend:** Saved queries/playbooks UI, report annotations v2, analytics v4, audit export presets.
- **Backend:** Playbook templates API, approval/audit linkage, ServiceNow connector, TI normalization & scoring, export automation.
- **Data/ETL:** ServiceNow mapping, STIX enrichment & dedupe metrics, schema approvals tooling.
- **SecEng:** Access reviews, saved search ACLs tests, policy coverage, DPIA updates.
- **SRE:** Release `v1.11.0`, connector SLOs & health panels, migration rehearsal, error‑budget guard.

---

## 4) Backlog (Stories & Tasks)

### P0 — Conversion #2

- **P0‑1** Migration Rehearsal (owner: SRE/BE)
  - Staging dataset; timing & rollback; sign‑off.
- **P0‑2** SOW Execution (owner: GTM/Legal)
  - Redlines closed; countersign; kickoff scheduled.
- **P0‑3** Day‑2 Ops Acceptance (owner: SRE/Product)
  - On‑call, quotas/budgets, backup/restore final.

### P0 — Saved Queries & Playbooks

- **P0‑4** Templates API (owner: BE)
  - Store NL→Cypher templates with params; versioning; approval link; audit IDs.
- **P0‑5** Playbooks UI (owner: FE)
  - Create/save/share; run with params; show generated Cypher; export results.
- **P0‑6** ACLs & Sharing _(P1)_ (owner: FE/SecEng)
  - Role‑based sharing; link tokens; audit on run.

### P0 — Report Annotations v2

- **P0‑7** Inline Highlights (owner: FE)
  - Select nodes/edges; annotate; thread comments; author/timestamp.
- **P0‑8** Export Engine Update (owner: FE/BE)
  - PDF/MD with highlights & provenance; redaction respected.

### P0 — ServiceNow Incident Connector

- **P0‑9** API Client + Normalizer (owner: BE/Data)
  - OAuth; incidents, comments, CIs; map → entities/edges; provenance; DLQ.
- **P0‑10** Throttling & Health (owner: SRE)
  - Backoff; retries; health SLO panel.

### P0 — Threat Intel v4

- **P0‑11** Enrichment Normalization (owner: BE/Data)
  - Normalize attributes; dedupe; link to indicators; confidence score.
- **P0‑12** Budget Guardrails (owner: SRE/BE)
  - Per‑tenant quotas; alert at 80%; block at 100%; logs.

### P0 — Webinar → Pipeline Ops

- **P0‑13** Lead Scoring (owner: GTM/Product)
  - Source, role, engagement; thresholds to MQL; routing to owners.
- **P0‑14** Meeting Handoffs (owner: GTM)
  - Auto calendar links; pilot opportunity creation; success plan pre‑templates.

### P0 — Analytics v4

- **P0‑15** Playbook Adoption (owner: FE/BE)
  - Usage per playbook; first‑insight time; export.
- **P0‑16** Conversion Dashboards (owner: SRE/Product)
  - Leads→meetings→pilots→prod; win‑rate; cycle time; cohort views.

### P1 — Quality & Ops

- **P1‑1** Export Presets (owner: FE)
  - Saved filters; one‑click.
- **P1‑2** Connector SLOs (owner: SRE)
  - Per‑connector latency/error SLOs; alerts.

---

## 5) Acceptance Criteria & DoD

- **Conversion #2:** signed SOW; migration rehearsal OK; day‑2 ops accepted.
- **Playbooks:** create/save/share; approval/audit linkage; run with params; exports include annotations & provenance.
- **ServiceNow:** incidents/comments/CIs ingested with provenance; health panel shows SLOs; throttling verified.
- **TI v4:** normalized enrichments with confidence; dedupe effective (≥ 50% duplicate reduction on test set); budget guardrails active.
- **Webinar Pipeline:** lead scoring operational; ≥ 15 qualified meetings scheduled; pilot opps created; ABM follow‑ups sent.
- **Analytics v4:** adoption & conversion dashboards populated; exports delivered to GTM weekly.

---

## 6) Cadence & Dates

- **Standup:** 09:30 MT daily
- **Mid‑sprint demo:** Mar 25, 15:00 MT
- **Code freeze:** Mar 31, 12:00 MT
- **Review & demo:** Apr 1, 15:00 MT
- **Retro:** Apr 1, 16:00 MT

---

## 7) Metrics

- **Business:** conversions, ARR commit, meetings, pilots created.
- **Product:** playbook saves/runs, report annotations used, TI dedupe %, ServiceNow ingest throughput.
- **Ops:** connector SLOs, error budget burn, DLQ size.

---

## 8) Deliverables (Repos & Docs)

- `docs/contracts/{SOW_production_2_signed.md}` + `docs/runbooks/migration_rehearsal_2.md`
- `server/src/playbooks/{templates.ts,runner.ts}` + `client/src/features/playbooks/*`
- `client/src/features/report/annotations/*` + `server/src/report/export_v2.ts`
- `ingestion/connectors/servicenow/{client.ts,normalizer.ts}` + `ops/dashboards/connector_slo.json`
- `server/src/ti/{normalize.ts,confidence.ts}` + `ops/costs/ti_budgets.yaml`
- `docs/gtm/webinar/{mql_scoring.md,handoff_playbook.md}`
- `ops/dashboards/conversion_funnel.json` + `client/src/admin/analytics/v4/*`
- `CHANGELOG_sprint-2026-03-18.md`

---

## 9) Demo Script (Apr 1)

1. Show signed SOW #2 + migration rehearsal.
2. Create & run a playbook from saved NL→Cypher; show approval/audit; export with annotations.
3. Ingest ServiceNow incidents; open health SLOs; demonstrate throttling.
4. Display TI normalized enrichments with confidence & budget guardrails.
5. Walk webinar → pipeline dashboards; show meetings scheduled and pilot opps created.
6. Review conversion dashboards & ARR commit trajectory.

---

**Owner:** Felix (The B.I.Z.) — VP Sales/BD/Growth  
**Last Updated:** Oct 15, 2025 (v1.11.0 plan)
```
