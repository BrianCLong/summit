# Sprint Plan — IntelGraph (Aug 25–Sep 5, 2025)

**Sprint length:** 10 business days  
**Timezone:** America/Denver  
**Release train:** Q3 2025 — Near‑term core GA path

---

## 1) Sprint Goal

Ship a verifiable **Provenance & Export MVP** and a read‑only **NL→Cypher Preview** inside Graph Explorer, with baseline **SLO dashboards** for graph query latency.

**Why now:** These are near‑term Q3 priorities, unblock case disclosure workflows, and create auditable guardrails for policy/ethics while we stand up Copilot safely.

---

## 2) Outcomes & Success Metrics

- Analysts can export a **disclosure bundle** with a provenance **manifest** (hash tree + transform chain) that external verifiers can check.
- Graph Explorer exposes an **NL prompt bar** that generates **Cypher preview** with cost/row estimates and executes in a **sandbox (read‑only)**.
- **Data License Registry** gates exports and shows human‑readable reasons (clause, owner, override path).
- **SLO dashboards** exist: p95 graph query latency tracked; heatmaps visible; alert wiring in place.

**Targets this sprint**

- NL→Cypher generator achieves **≥95% syntactic validity** on a 100‑prompt test set.
- Export bundle **verifies on an external script**; disclosure packager integrates manifest.
- SLO widget shows **p95 < 1.5s** for the demo dataset (informational; tune in later sprints).

---

## 3) Scope — User Stories & Acceptance Criteria

### S1 — Provenance & Claim Ledger: Export Manifest (Backend)

**As** an analyst  
**I want** export bundles to include a verifiable manifest (hashes + transform chain)  
**so that** recipients can independently verify integrity & lineage.

**Done when**

- `prov-ledger` service registers evidence, builds Merkle‑style hash tree, records transform chain.
- `prov_json.export()` returns `{"manifest": {hash_tree, transforms, sources}}` alongside nodes/edges.
- CLI verifier (`prov-verify`) validates an exported bundle offline.
- Unit tests cover hash determinism and chain continuity.

**Implementation notes**

- Extend `prov-ledger/app/exporters/prov_json.py` to emit manifest.
- Add `prov-ledger/app/provenance/manifest.py` with hash helpers (blake3/sha256) and transform schema.

### S2 — Disclosure Packager (API + UI)

**As** a case owner  
**I want** a one‑click **Export with Manifest**  
**so that** I can share a verifiable disclosure bundle.

**Done when**

- API endpoint `POST /cases/{id}/export` streams a zip with evidence, manifest, license terms.
- Graph Explorer adds **Export** button (case scope) with progress and success/error states.
- A **manifest verifier** runs in CI on exported artifacts for demo cases.

**Implementation notes**

- Server: GraphQL mutation `exportCase` → job → stream response.
- Client: `client/components/GraphExplorer.tsx` export button + toast.

### S3 — NL→Cypher Preview (Copilot v1, Read‑Only)

**As** an analyst  
**I want** to type a natural‑language question  
**so that** I can preview generated **Cypher** before running it in a sandbox.

**Done when**

- UI prompt bar renders above graph; shows generated Cypher with **cost/row estimates**.
- **Sandbox execution** reads from a **read‑replica** or ephemeral DB; no writes allowed.
- Test harness of 100 prompts reaches **≥95% syntactic validity**; rollback/undo supported.

**Implementation notes**

- Reuse `copilot/` prompt templates; add `server` route `POST /copilot/nl2cypher` returning preview + plan.
- Wire to `graph-xai` for path rationales in a future sprint (stub now).

### S4 — License & Policy Guardrails for Export

**As** a data steward  
**I want** exports blocked when a source license forbids it  
**so that** we comply with terms and show a clear reason & appeal path.

**Done when**

- License registry exists in `server` with source → license mapping.
- Export attempts check policy; **blocked exports** return UI banner with: clause, owner, and override path.
- Audit log records attempted action + reason‑for‑access.

**Implementation notes**

- Add `server/policy/license_engine.ts` + `server/policy/messages.ts`.
- Client toast/banner displays reason and appeal flow link.

### S5 — Observability & SLO Dashboards

**As** an operator  
**I want** query latency metrics and heatmaps  
**so that** we can track performance and alert on regressions.

**Done when**

- Prometheus + OTEL emit: query latency histograms, SLO p95 panel, saturation dashboards.
- Alerts configured for SLO burn rate; admin console shows connector health and audit search basics.

---

## 4) Non‑Goals (This Sprint)

- Federated/multi‑graph search, Predictive Suite execution, Graph‑XAI explainers UI, offline kit sync logic.
- Write‑capable Copilot actions; any human‑subject or coercive modules (never).

---

## 5) Work Breakdown & Owners

**Backend**

- `prov-ledger`: manifest builder, CLI verifier — **Backend Lead**
- Export job & stream, audit hooks — **Tech Lead**
- License engine & policy messages — **Security Champion**

**Frontend**

- Export UI, NL prompt bar, Cypher preview panel — **Frontend Lead**
- Sandbox exec + result table; cost/row badges — **Frontend Lead**

**DevEx & Ops**

- Prom/OTEL wiring; SLO dashboards; admin console tiles — **SRE/Operator**

**QA**

- Acceptance packs; 100‑prompt harness; screenshot diffs; e2e ingest→export — **QA Lead**

**PM/UX**

- Prompt set curation; microcopy for guardrails; export flows; consent and right‑to‑reply copy — **Product Manager / UX**

---

## 6) Definition of Ready (DoR)

- Demo dataset with clear licenses; case with 20+ exhibits.
- 100 NL prompts labeled by intent & expected shape.
- Read‑replica or ephemeral DB available for sandboxing.
- Ombudsman sign‑off on policy messages.

## 7) Definition of Done (DoD)

- Feature flags on; docs & tooltips shipped; unit + e2e tests green.
- Exported bundles **verify** with CLI tool; CI job asserts integrity.
- SLO panels visible; alert rules deployed; runbooks linked.
- Ethics/oversight review recorded; audit shows who/what/why/when.

---

## 8) Day‑by‑Day Milestones (Aug 25–Sep 5)

**Mon 8/25** Kickoff; finalize prompts; DB sandbox ready; scaffolding for manifest/exports.  
**Tue 8/26** Manifest hash tree + transform chain; begin export endpoint; UX polish for Export.  
**Wed 8/27** NL→Cypher service stub; UI preview panel; license registry schema.  
**Thu 8/28** Sandbox exec path; cost/row estimates; blocked‑export UI copy + appeal link.  
**Fri 8/29** Prom/OTEL wiring; SLO panels; initial 100‑prompt run; fix syntax failures.

**Mon 9/1** (Labor buffer or focus time) Harden export streaming; add verifier to CI.  
**Tue 9/2** E2E ingest→resolve→export path; screenshot diffs; docs & tooltips.  
**Wed 9/3** Guardrail messages review (ombuds); alert rules; admin tiles.  
**Thu 9/4** Bug bash; acceptance pack sign‑offs; performance tune demo dataset.  
**Fri 9/5** Sprint review & release; retro; backlog grooming.

---

## 9) Risks & Mitigations

- **Graph syntax drift** in NL→Cypher → lock a prompt set; add lint + parser tests.
- **License ambiguity** → require source of authority; link to license text; add override workflow.
- **Latency misses** → demo‑data SLO only; add caching and sampling; defer heavy analytics.
- **Ethics/abuse** → no write actions; reason‑for‑access prompts; immutable audit; ombuds queue.

---

## 10) Stretch (Only if Ahead)

- “Explain this view” tooltip for graph panels (copy + stub).
- Minimal “manifest viewer” in UI.

---

## 11) Artifacts to Touch (repo)

- `prov-ledger/` (exporters, manifest helpers)
- `server/` (export job, policy/license engine, audit)
- `client/components/GraphExplorer.tsx` (Export UI, NL prompt)
- `graph-xai/` (stubs for future path rationales)
- `docs/project_management/` (acceptance packs, runbooks)

---

## 12) Review Checklist (Demo Day)

- Export a case; verify bundle offline; show manifest.
- Block an export; show license reason & appeal path.
- Ask 5 NL questions; show Cypher preview and one sandboxed execution.
- Open SLO dashboard; show p95 panel + heatmap + alert test.

> The committee remains user‑centered: ship the smallest slice that is **auditable, ethical, and operable** — then iterate.
