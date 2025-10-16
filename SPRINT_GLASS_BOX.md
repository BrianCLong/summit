# Sprint Prompt — Operation **GLASS BOX** (Wishlist Sprint 05)

**Window:** 2 weeks — Monday start, Friday 1500 demo.
**Theme:** Automations you can trust: **playbooks, counterfactuals, narrative**, all glass‑box, policy‑guarded, and fully reversible.
**Rallying cry:** Simulate first. Explain always. Sign everything.

---

## 1) Mission (Non‑Negotiable)

Ship a demonstrable slice that enables **automation playbooks** (dry‑run by default), **what‑if/counterfactual analysis**, and a **narrative engine** that converts evidence and claims into an auditable brief — with **data integrity/quarantine** controls and **jurisdiction/residency** enforcement. Every automated action must be **explainable, reversible, and signed**.

---

## 2) Scope (In)

1. **Playbooks v1.0 (Low‑Code, Signed)**
   - YAML/JSON + UI builder for read‑only analytics + controlled writes (only to `CaseNote`, `Task`, `Tag`, `DisclosureDraft`).
   - Steps: NL→Cypher query, filter, map, assert, write allowed types, export.
   - **Dry‑run default** with effect preview + diff; “commit” requires **reason‑for‑action** and OPA allow; all commits produce a **signed action manifest** (hash chain).

2. **Counterfactuals & What‑If v0.9**
   - Branch case state: add/remove evidence, undo/redo merges, time‑shift (`asOf`), or parameter tweaks (thresholds).
   - Compute deltas: affected claims, community labels, alerts, report snippets; show **risk/coverage delta**.
   - No destructive writes — branches are ephemeral until promoted via playbook commit.

3. **Narrative Engine v0.9**
   - Templates for: executive brief, incident synopsis, technical appendix.
   - Pulls **claims with citations**, timeline, geo/graph figures; inserts **confidence + competing‑hypotheses slots**; supports disclosure modes (Internal/Partner/Public).
   - Editor with guardrails (no uncited assertions; license captions auto‑inserted).

4. **Anomaly Baselines v0.8 (Interpretable)**
   - Deterministic detectors: rate change (EWMA), rarity by cohort, time‑of‑day deviation; option for Isolation Forest behind a flag.
   - Each alert includes human‑readable explanation (feature deltas) and links to counterfactual: “What if threshold = X?”

5. **Data Integrity & Quarantine v0.8**
   - Source trust scores; checksum verification on ingest and export; **quarantine** route for suspect streams with red banners and blocked automations.
   - Poisoning canaries on fixtures; license trust enforcement on playbook export.

6. **Residency & Jurisdiction v0.8**
   - Data labels: `region`, `residency`, `legalBasis`.
   - OPA enforces: cross‑border access, export bounds, playbook write scopes; block page shows clause + appeal.

7. **Edge/Offline Sync v0.8**
   - Signed **sync logs** for offline disclosure drafting; conflict resolution (last‑writer‑wins + manual merge for notes); verifier checks signatures upon re‑sync.

---

## 3) Scope (Out)

- Full auto‑remediation beyond allowed write types.
- LLM‑generated narratives without citations.
- Multi‑region storage automation (labels only this sprint).

---

## 4) Deliverables

- **Playbook engine** (runner + UI builder) with dry‑run, commit, and signed manifests.
- **Counterfactual service** with branch management and delta computation.
- **Narrative templates** and guarded editor; disclosure‑mode integration.
- **Anomaly baseline** detectors with explanations.
- **Integrity/quarantine** controls and UI.
- **Residency/OPA policies** and tests.
- **Edge sync tool** + offline verifier.

---

## 5) Acceptance Criteria (Definition of Done)

### Playbooks

- Users can assemble a playbook in UI or YAML; **dry‑run** shows affected nodes/edges/notes; **commit** requires reason + OPA allow; action manifest signed and downloadable.
- Allowed writes limited to `CaseNote`, `Task`, `Tag`, `DisclosureDraft`; any other write **denied** with clause.

### Counterfactuals

- Branching supports: add/remove evidence, undo/redo merges, time‑shift (`asOf`), or parameter tweaks (thresholds).
- Delta view lists changed claims, alerts, community labels, and report sections; promote via playbook commit → signed manifest includes branch lineage.

### Narrative Engine

- Generates brief that passes lint: **no uncited claim**, confidence language present, competing‑hypotheses included (even if empty).
- Exports in Internal/Partner/Public modes with correct redactions and license captions; **verifier PASS**.

### Anomaly Baselines

- On fixtures, rule‑based detectors flag expected events; each alert carries **human explanation** and a link to an auto‑generated counterfactual sandbox.
- Isolation Forest behind feature flag; block any unsourced features.

### Integrity & Quarantine

- Quarantine status blocks playbook commits touching suspect sources; banners visible in UI; checksums verified on export; poisoning canary triggers alert and audit.

### Residency & Jurisdiction

- Access/export outside residency bounds **denied** with clause; allowed actions show obligations; logs persist region, basis, reason.
- Cross‑border demo shows blocked and then permitted (with proper basis) flows.

### Edge/Offline

- Create disclosure draft offline; sync produces **signature‑verified** notes and manifests; conflict resolution (last‑writer‑wins + manual merge for notes); verifier checks signatures upon re‑sync.

---

## 6) Work Breakdown (By Workstream)

### Backend / Services

- **playbook‑engine**: runner, dry‑run diff, signer (hash chain), allowlisted writers.
- **counterfactual‑svc**: branch snapshots, delta calculators (claims/alerts/community/narrative).
- **narrative‑svc**: template rendering, citation enforcement, disclosure mode hooks.
- **anomaly‑svc**: EWMA/rate, cohort rarity, time‑of‑day; optional IF flag.
- **policy‑gateway (OPA)**: residency/export/write scopes; reason‑for‑action plumbing.
- **edge‑sync**: signed logs, conflict resolver, offline verifier.

### Frontend / Apps

- **Playbook Builder**: drag‑step UI + YAML editor; dry‑run diff; commit modal (reason, obligations, signatures).
- **What‑If Panel**: branch controls; delta view with risk/coverage chips; promote via playbook.
- **Narrative Studio**: template selector; citation linter; disclosure mode preview; export.
- **Quarantine UI**: source banners; block badges on actions.
- **Residency UX**: region badges; block page with clause; obligations chip.
- **Edge Kit**: offline editor; sync & verify panel.

### Graph / DB

- Entities: `Playbook`, `Action`, `Branch`, `Delta`, `Quarantine`, `ResidencyLabel`.
- Append‑only **action ledger** with signatures; branch lineage pointers.

### Data / Fixtures

- Poisoned stream samples; residency‑labeled datasets across regions; narrative template fixtures with citations; anomaly baselines with expected spikes.

### DevEx / SRE

- CI: playbook dry‑run/commit tests, signature checks, citation lint, OPA policy suite.
- Perf: counterfactual branch + delta p95 < 2s on 50k‑node fixture; playbook commit < 1s for allowed writes.
- Chaos: revoke signer key mid‑run → safe fail and audit.

---

## 7) Test Plan

- **Unit:** playbook steps; signer; delta calculators; narrative linter; anomaly rules; OPA residency/write scopes.
- **E2E:** build playbook → dry‑run → counterfactual branch → promote → narrative export (3 modes) → offline verifier PASS.
- **Load:** 25 concurrent playbook dry‑runs; 100 counterfactual branches; anomaly throughput 20/s.
- **Chaos:** signer key rotation; quarantine flip during commit; offline conflict merge.

---

## 8) Demo Script (15 min)

1. Build a **Playbook** from blocks; run **dry‑run**; show diff and obligations; **commit** with reason → signed manifest.
2. Launch **What‑If**: remove a piece of evidence and time‑shift **as of** last week; see deltas (claims/alerts/community).
3. Generate **Narrative**; linter catches uncited text; fix with citation; export in **Partner** and **Public** modes; **verifier PASS**.
4. Trigger **Quarantine** on a suspect source → commit blocked; show banner + audit.
5. Attempt cross‑border export → **Denied**; add legal basis + mode → allowed with obligations.
6. Edit disclosure **offline**; sync back; signatures verified; conflict resolved.

---

## 9) Metrics (Exit)

- 100% actions in ledger are signed and verifiable.
- Counterfactual delta p95 < 2s on fixture; playbook commit < 1s.
- Narrative exports: 100% **verifier PASS**; zero uncited claims.
- Residency blocks: 100% enforced; audit completeness 100%.
- Quarantine prevents 100% of disallowed commits on suspect sources.

---

## 10) Risks & Mitigations

- **Automation overreach:** strict allowlist; dry‑run default; reason‑for‑action; signatures.
- **Counterfactual confusion:** clear delta chips; branch labels; promotion only via playbook.
- **Narrative drift from evidence:** hard linter; citation templates; disclosure modes.
- **Residency misconfig:** policy tests; visible badges; pre‑export checklists.
- **Signer key ops:** rotation plan; HSM/stored secret; fallback deny.

---

## 11) Dependencies

- Sprints 01–04 running (provenance, deterministic+probabilistic ER, OPA, disclosure bundles, tri‑pane, geo ops, federation basics).
- Signer key management; OPA residency policies scaffold.

---

## 12) Stretch (only if green by Day 7)

- Playbook **library** with reusable blocks; marketplace import/export.
- Counterfactual **Monte Carlo** parameter sweeps with batch deltas.
- Narrative **style packs** (agency vs. exec vs. legal) with lint profiles.

---

## 13) Operating Rules

- **Provenance over prediction.**
- **Reversible automation.**
- **Policy by default; reasons mandatory.**
- **Explainability first; black‑box last.**

---

## 14) User Stories

- _As an analyst,_ I can assemble and dry‑run a playbook, see its effects, and commit with a signed manifest.
- _As a reviewer,_ I can inspect counterfactual deltas and require reasons before promotion.
- _As a writer,_ I can generate a narrative that cites every claim and exports in the correct disclosure mode.
- _As a DPO/ombudsman,_ I can verify signatures, see residency enforcement, and block automation on quarantined sources.

> **Orders:** Simulate first, then commit. Make every step legible. Sign the trail.
