# Execution Order: Next Work (Two‑Week Value Slice)
_Date:_ 2025-10-03  
_Sponsor:_ Co‑CEO (Topicality)  
_PM of Record:_ <PM-Name>  
_Run ID:_ (to be created in Maestro)  

---

## 0) Objective (Decision‑First)
Deliver a **provable value slice in ≤ 14 days** that a design partner can validate in production‑like conditions, with **full provenance** (IntelGraph claims + Maestro run artifacts).

**North-star for this slice**  
> "One customer decision they trust _because_ of our provenance."  

**Success Metrics**
- Time to first value ≤ 14 days (demo running + evidence).  
- Provenance manifest coverage: 100% for slice.  
- p95 query latency ≤ 300 ms under target load (slice scope).  
- Design partner signs off on ROI hypothesis with baseline + delta measurement.  

---

## 1) Scope (Small, Reversible, Evidence‑Heavy)
- **Use Case:** "Disclosure‑first intel brief for weekly portfolio review" (summarized decisions + sources + claim ledger).  
- **Users:** Product owner + one exec at design partner.  
- **Inputs:** 3–5 RSS/Atom feeds + 2 Google Docs + 10 URLs/week.  
- **Outputs:** Markdown brief + claim ledger (IntelGraph) + downloadable Disclosure Pack (zip index).  
- **Not in scope (this slice):** Multi-tenant scaling, billing, LLM fine‑tuning.  

---

## 2) Workstreams & Owners
1. **Product & PM** — _Owner: <PM-Name>_
2. **IntelGraph (Graph + Claims)** — _Owner: <Graph-Lead>_
3. **Maestro (Runs + Artifacts)** — _Owner: <Maestro-Lead>_
4. **Connector & ETL** — _Owner: <Data-Lead>_
5. **App & API (UI + SLOs)** — _Owner: <Eng-Lead>_
6. **Governance & Prov. Pack** — _Owner: <Gov-Lead>_
7. **Design Partner Success (GTM)** — _Owner: <GTM-Lead>_

> Each stream creates a short memo (Context, Options, Decision, Risks, Owners, Checks). Link memo to IntelGraph Decision node.

---

## 3) Milestones & Calendar
**Day 0 (Today):** Kickoff, scope lock, create Maestro run plan + budgets.  
**Day 3:** Ingestion to claim ledger end‑to‑end; first auto‑generated brief (internal).  
**Day 7:** Exec‑readable demo + latency + provenance coverage report.  
**Day 10:** Design partner dry‑run; feedback logged as Decisions.  
**Day 14:** ROI proof + Disclosure Pack delivered; go/no‑go to expand.  

Cadence: Daily 15‑min standup; M/W/F 30‑min risk review; Day 7 demo; Day 14 sign‑off.

---

## 4) Assignments with DoD, Prompts, and Artifacts

### 4.1 Product & PM — _Owner: <PM-Name>_
**Definition of Done (DoD)**  
- PRD v1 approved; scope frozen; risks labeled (one‑way/two‑way).  
- Design‑partner success criteria signed by customer.  

**Tasks**  
- Draft PRD (problem, user, inputs/outputs, non‑goals).  
- Set Maestro budgets (time/cost); freeze window.  
- Create Decision nodes for scope & success metrics.  

**Prompts (copy‑paste)**  
- _IntelGraph: Create Scope Decisions_  
  ```
  Create Decision nodes: {"Context":"Two‑week value slice for disclosure‑first brief.","Options":["Narrow feeds","Add one custom connector"],"Decision":"Narrow feeds","Reversible":true,"Risks":["Coverage gap"],"Owners":["<PM-Name>"],"Checks":["Day7 demo", "ProvCoverage=100%"]}
  ```
- _Maestro: Plan + Budget_  
  ```
  maestro.plan name:"value-slice-2025-10" budget:{time_days:14,cost_usd:<<cap>>} gates:["sbom","slsa","risk_assessment","rollback_plan"]
  ```

**Artifacts**: PRD.md, RunPlan.yaml, Decision-Scope.json.

---

### 4.2 IntelGraph — _Owner: <Graph-Lead>_
**DoD**  
- Entities (Sources, Claims, Decisions) exist with IDs; policy labels set.  
- Provenance Claim Ledger emits manifest for each brief.  

**Tasks**  
- Define schemas: `Entity(Source)`, `Claim`, `Decision`, `PolicyLabel`.  
- Implement claim ingestion API; dedupe + citation hashing.  

**Prompts**  
```
Create schemas: Entity(Source){origin,sensitivity,legal_basis,url,hash}, Claim{id,source_id,text,confidence,policy_labels}, Decision{template_fields}
Expose endpoint POST /claims (payload: url,text,labels) -> returns claim_id + manifest_path.
```

**Artifacts**: schema.graph.json, claim_ingest_api.md, sample_manifest.json.

---

### 4.3 Maestro — _Owner: <Maestro-Lead>_
**DoD**  
- Plan→Run→Artifact lifecycle working; attestation attached to each artifact.  

**Tasks**  
- Define steps: ingest → dedupe → summarize → render → pack → attest.  
- Integrate cosign, osv-scan, trivy; emit SBOM + SLSA provenance.  

**Prompts**  
```
maestro.step name:ingest inputs:feeds[] outputs:raw.ndjson attest:true
maestro.step name:summarize inputs:raw.ndjson outputs:brief.md policy:"disclosure-first"
maestro.step name:pack inputs:[brief.md,manifest.json] outputs:disclosure_pack.zip attest:true
```

**Artifacts**: pipeline.yaml, sbom.spdx.json, slsa.provenance.json.

---

### 4.4 Connector & ETL — _Owner: <Data-Lead>_
**DoD**  
- 3 feeds + 2 docs + 10 URLs ingested hourly; retries & backoff.  

**Tasks**  
- Implement RSS/Atom puller; Google Docs fetcher; URL harvester.  
- Compute content hash + source labels; push to IntelGraph.  

**Prompts**  
```
Design connectors: rss.pull(url)->items[], gdoc.export(fileId)->md, url.fetch(u)->html
For each item: compute sha256; POST /claims with {url,text,labels:{origin:web,sensitivity:public,legal_basis:contract}}
```

**Artifacts**: connectors.md, etl_jobs.cron, ingestion_metrics.csv.

---

### 4.5 App & API — _Owner: <Eng-Lead>_
**DoD**  
- Web UI renders brief with inline citations; p95≤300ms at N=100 requests/min.  

**Tasks**  
- Build `/brief/:runId` view; include risk badges + download pack.  
- Add health checks, tracing, latency dashboards.  

**Prompts**  
```
UI spec: Card grid -> sections [Top Decisions, Sources, Claims]. Each claim shows source hash + link.
API: GET /brief/{runId} -> {title, decisions[], claims[], manifest_url}
Load test: target rps=1.7, p95<=300ms, error<=0.1%.
```

**Artifacts**: api_spec.yaml, brief_view.md, load_test_report.md.

---

### 4.6 Governance & Disclosure Pack — _Owner: <Gov-Lead>_
**DoD**  
- Risk assessment + DPIA (if applicable); default redactions; watermarks.  
- Disclosure Pack index with SBOM, SLSA, risk memo, rollback plan.  

**Tasks**  
- Define policy labels; apply at source & claim level.  
- Create rollback criteria + auto‑rollback policy in Maestro.  

**Prompts**  
```
Generate Disclosure Pack index: index.md -> links [sbom.spdx.json, slsa.provenance.json, risk.md, rollback.md]
Redaction policy: redact PII/contractual terms by default; watermark exports 'Confidential – Design Partner'.
```

**Artifacts**: policy_labels.md, risk.md, rollback.md, disclosure_index.md.

---

### 4.7 Design Partner Success (GTM) — _Owner: <GTM-Lead>_
**DoD**  
- Signed test plan + ROI baseline; feedback loop creates Decision nodes.  

**Tasks**  
- Capture current workflow & time spent; define target delta.  
- Schedule Day 10 dry‑run + Day 14 readout.  

**Prompts**  
```
Customer memo: Context, Pain, Current Metric (hrs/brief), Target (hrs/brief), Decision owner, Sign-off date.
Create Decision nodes for feedback items; tag reversible=true.
```

**Artifacts**: customer_test_plan.md, roi_baseline.xlsx, feedback_decisions.json.

---

## 5) Risks & Controls
- **Data sensitivity drift** → Default policy labels + export redactions; audit logs.
- **Latency regression** → p95 gates in CI; auto‑rollback on SLO breach.
- **Scope creep** → Two‑week freeze; only reversible changes allowed.
- **Connector instability** → Retries + backoff; synthetic test feeds.

---

## 6) Checkpoints & Reviews
- **Daily:** 15‑min standup (owner, blocker, next proof).  
- **M/W/F:** Risk review (heatmap update).  
- **Day 7:** Demo + provenance coverage report.  
- **Day 14:** ROI readout + go/no‑go decision.

---

## 7) RACI
- **Responsible:** Stream owners.  
- **Accountable:** Co‑CEO, PM of Record.  
- **Consulted:** Security, Legal (governance).  
- **Informed:** Exec sponsor, design partner POC.

---

## 8) Definitions & Templates
- **Decision Template Fields:** Context, Options, Decision, Reversible?, Risks, Owners, Checks.  
- **Policy Labels:** origin, sensitivity, legal_basis.  
- **Success Criteria (canary):** error_rate<=X, latency_p95<=300ms, cost/req<=Z.  

**Command Snippets (fill parameters)**
```bash
# Create run
maestro run create --name value-slice-2025-10 --budget-time 14d --budget-cost $CAP --gates sbom,slsa,risk_assessment,rollback_plan

# Register decision
intelgraph decision create --file decision_scope.json

# Attach artifacts
maestro artifact attach --run value-slice-2025-10 --path disclosure_pack.zip --attest
```

---

## 9) Owner Table (fill‑in)
| Workstream | Owner | Proof‑by Date | Key Artifact |
|---|---|---:|---|
| Product & PM | <PM-Name> | Day 2 | PRD.md |
| IntelGraph | <Graph-Lead> | Day 3 | schema.graph.json |
| Maestro | <Maestro-Lead> | Day 3 | pipeline.yaml |
| Connector & ETL | <Data-Lead> | Day 4 | ingestion_metrics.csv |
| App & API | <Eng-Lead> | Day 7 | load_test_report.md |
| Governance | <Gov-Lead> | Day 7 | disclosure_index.md |
| Partner Success | <GTM-Lead> | Day 10 | roi_baseline.xlsx |

---

## 10) Go/No‑Go Criteria (Day 14)
**Go if:**
- Provenance manifest coverage 100%; Demo passes p95≤300ms; Customer validates delta ≥ X% time savings.  
**No‑Go if:**
- Any critical policy violation; SLO breach for two consecutive windows; Customer trust not achieved.

---

> _PM Action_: Populate owner names, dates, and budgets; open Maestro Run; link Decision nodes. Begin execution now.

