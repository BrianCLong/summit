By the runes of Scrum, we conjure a crisp, two-week sprint that delivers a thin, end-to-end “golden path” across ingest → provenance → NL graph query → evidence-backed brief.

# Sprint: Dec 1–12, 2025 (America/Denver) — “Golden Path Alpha”

**Sprint Goal:** Prove an end-to-end workflow that (1) maps a CSV to canonical entities with lineage, (2) enforces data-license rules at export, (3) executes a natural-language graph query with generated Cypher preview, and (4) publishes a brief with validated citations. This aligns directly to the Wishbook’s core capability map and acceptance gates.  

---

## Sprint Backlog (stories, AC, estimate)

1. **Ingest Wizard v0 — CSV→Entities in ≤10 min** — *8 pts*
   As an analyst, I can map a CSV/JSON to canonical entities with PII flags and see policy reasons for blocked fields; lineage is recorded.
   **Acceptance:** “user maps a CSV/JSON→canonical entities in ≤10 min; PII flags; blocked fields show policy reasons; lineage recorded.” 

2. **Data License Registry — Export Blockers** — *5 pts*
   As a compliance lead, I see human-readable reasons when an export is blocked (license clause, owner, override workflow).
   **Acceptance:** “blocked export shows license clause, owner, override workflow.” 

3. **Provenance & Claim Ledger — Verifiable Manifest** — *8 pts*
   As a reviewer, exported bundles include a hash-tree + transform-chain manifest verifiable offline.
   **Acceptance:** “export produces manifest (hash tree, transform chain), verifiable by external verifier.” 

4. **NL Graph Querying — Cypher Preview + Sandbox** — *8 pts*
   As an analyst, I type a natural-language question, view generated Cypher + cost/row estimate, then run it in a sandbox.
   **Acceptance:** “≥95% syntactic validity on test prompts; rollback/undo supported.” 

5. **GraphRAG — Evidence-First Citations Gate** — *5 pts*
   As a brief author, responses must cite resolvable evidence; missing citations block publication.
   **Acceptance:** “citations always resolve to evidence; missing citations block publication.” 

6. **Brief/Report Studio — Manifest Validation on Export** — *5 pts*
   As a case owner, I export a redacted PDF/HTML brief; all edits/audits are visible and the export is validated via the manifest verifier.
   **Acceptance:** “all edits/audits visible; export validated via manifest verifier.” 

**Stretch (time-boxed):** Hook a minimal Proof-Carrying Analytics (*.pcq*) manifest from the deterministic DAG runner into #3 (export pipeline). 

---

## Definition of Done (DoD)

* Feature behind a flag, documented, and demoable on stage env; passes acceptance criteria cited above.
* Unit/contract tests + E2E: *ingest → resolve → runbook → report* with screenshot diffs; Cypher tests on ephemeral DB. 
* Security & governance: STRIDE controls mapped; no criticals outstanding. 
* Observability: traces/metrics/logs wired; SLO dashboards updated. 

## Definition of Ready (DoR)

* User story has measurable AC; dependencies and flags listed; test data identified; design notes or wire stub attached per PRD hygiene. 

---

## Capacity & Forecast

* Team cap: ~40–45 pts/2 weeks (5 devs, 1 QA, 1 designer, 1 PM). Backlog above totals ~39–44 pts (stretch optional).
* Success KPIs this sprint: % exports with valid manifests; % NL queries that compile; blocked-export clarity rate; E2E demo pass. 

---

## Ceremonies & Calendar (America/Denver)

* **Sprint Planning:** Mon Dec 1, 09:30–11:00
* **Daily Stand-up:** 09:15–09:30 (15 min)
* **Backlog Refinement:** Thu Dec 4, 14:00–14:45
* **Sprint Review + Live Demo:** Fri Dec 12, 10:00–11:00
* **Retro:** Fri Dec 12, 11:15–12:00

---

## Release/Env, Flags & Data

* **Envs:** dev → stage; canary to stage with auto-rollback + schema gates. 
* **Feature flags:** `ingestWizardV0`, `licenseRegistryV0`, `provManifestV0`, `nlCypherV0`, `graphRagGateV0`, `reportManifestCheckV0`.
* **Test data:** Sample CSV + golden fixtures for mapping/ETL and evidence bundles; demo corpus aligned to “Final Product” asks. 

---

## QA Plan (what we’ll test)

* **Functional:** Wizard mapping (goldens), export blockers (license clause surfaces), manifest verification, Cypher compile rate, citation resolution.   
* **E2E:** ingest → brief export with manifest check. 
* **Non-functional:** SLO smoke (p95 graph query & ingest timing), red-team prompts archived.  

---

## Risks & Mitigations

* **Cypher validity <95% on real prompts** → seed prompt set + rollback/undo path; sandbox first. 
* **Export blocker UX confusion** → ensure human-readable reasons + owner/override path in UI copy. 
* **Manifest verifier drift** → lock schema and include golden transform chain in fixtures. 

---

## Reporting Artifacts (to produce during sprint)

* **Burndown + throughput chart**, **DOR/DOD checklist run**, **demo script**, and **mini-PRD addendum** covering scope, AC, KPIs, and risks per PRD template.  

---

## Alignment & Road-Ahead

* Matches Near-Term road-map: Provenance-Ledger beta, core ingest/graph/copilot, and auditability. 
* Sets up next sprints: Proof-Carrying Analytics (*.pcq*), Authority Compiler, and selective disclosure wallets. 
* Long-horizon inspiration (future epics): Counterfactual proof cartridges & dialectic co-agents (Vol III) and quantum-safe proofing (Vol IV).  

---

### Done this sprint = a shippable increment

A running “golden path” showcasing: wizarded ingest → license-aware governance → verifiable provenance → NL graph query → evidence-validated brief. This directly reflects the Council’s end-state vision and master backlog structure.  
