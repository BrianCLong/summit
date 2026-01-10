# Disinformation Defense Workbench — GA Sprint Plan and Prototype Spec

## 1) North Star & Differentiation

- **Positioning**: "We sell verifiable truth under lawful constraints"—a proof-carrying counter-deception platform that binds every analytic and action to authority, purpose, and reproducible evidence.
- **Personas**: Election integrity analyst; communications incident commander; trust & safety lead; investigative journalist partner; regulator/auditor.
- **Jobs-to-be-Done & Pain**:
  1. Rapidly intake and normalize narrative signals with verifiable provenance; pain: fragmented feeds and unverifiable screenshots.
  2. Detect coordinated amplification/fabrication with auditable evidence; pain: opaque ML outputs, false positives.
  3. Attribute manipulation confidence while managing legal/policy limits; pain: unclear authority/licensing to act or share.
  4. Plan countermeasures with harm-aware gates; pain: rushed takedowns causing collateral harm/claims of bias.
  5. Publish selective-disclosure evidence packs; pain: partners demand proof without data transfer risk.
- **Differentiation Map**: Competitors offer dashboards and heuristic alerts; we deliver (a) proof-carrying analytics/queries with offline verifier, (b) authority/license/purpose binding that prevents disallowed joins/exports, (c) zero-copy collaboration via claim/proof exchange, (d) auditable autonomy with glass-box agents/runbooks, (e) risk-of-harm controls with dissent/ombuds workflow.

## 2) GA MVP Scope

- **Ingest**: RSS/news wires, platform report APIs, encrypted tipline inbox, fact-check corpora; optional CTI/OSINT overlays (STIX/TAXII as signed claims only).
- **Graph Core (entities/edges)**: Narrative, Claim, Campaign, Account/Asset, Source, Evidence, Intervention, Authority, License, Purpose tags, Confidence, RiskBudget nodes; edges typed for support/contradict/derives-from/mentions/co-posts/amplifies/has-authority/bound-by-license.
- **Analytics**: Amplification cadence signatures; coordination motifs (co-post, URL reuse, infra reuse); contradiction graph detection; fabrication radar (metadata/provenance anomalies); narrative field/spread indicators; geo-temporal overlays.
- **Copilot**: Evidence-first RAG with inline citations; NL→query preview with policy check; "explain this view/decision" summarizer citing ledger entries.
- **Response Planning**: Courses of action (COA) planner scoring uplift vs. civil-harm meter; requires authority and dissent capture before execution.
- **Export**: Selective-disclosure evidence wallet with verifier; proof-of-non-collection report for auditors; offline reproducibility bundle.

## 3) UX Blueprint

- **Primary Journey (10–14 steps)**: (1) Signal arrives → (2) Policy-tagged intake → (3) Provenance hashing & license binding → (4) Narrative/claim dedupe & graph stitch → (5) Amplification/fabrication radar auto-runs → (6) Analyst triage queue with risk budget → (7) Open case room (compartment, reason-for-access) → (8) Copilot query with inline citations & policy preview → (9) Contradiction/coordination views (graph/timeline/map tri-pane) → (10) COA planner with harm meter + dissent prompt → (11) Ombuds review if high risk/appeal → (12) Selective evidence pack preview (audience scoped) → (13) "Verify" run (offline reproducibility) → (14) Publish/notify with revocation handle.
- **Tri-Pane UI**: Left graph pane (entities/edges with provenance badges); center timeline (volume, cadence anomalies, contradictions); right map (geo overlays, infra clusters). Docked "Explain this decision" panel shows reasoning trace with citations and authority bindings. "What changed?" diff: deltas in claims, confidence, risk budget, and authority state.
- **"Verify" Button**: Runs proof-carrying query replay in sandbox using pinned sources/models/hashes; displays pass/fail with mismatch diffs; missing citations trigger block + gap list.
- **Collaboration Model**: Case rooms with compartments, reason-for-access required; two-person controls for high-risk COAs/exports; immutable chat with citation pinning; zero-copy partner view shows proofs only.
- **Ombuds & Dissent Workflow**: Triggered by high harm score, missing authority, or analyst dissent; blocks COA until ombuds signs; appeals logged with counterfactuals.

## 4) Runbooks (GA, replayable DAGs)

- **1. Narrative Intake → Claim Ledger Creation**
  - Inputs: Tagged feeds, tipline submissions, fact-check corpora; Preconditions: authority/purpose/license tokens present.
  - Steps: Normalize → hash artifacts → extract claims → bind license/purpose → write to claim ledger with provenance gaps flagged → emit audit artifacts.
  - Outputs: Claim/Narrative nodes with citations; gap report.
  - KPIs: Time-to-ingest, % with complete provenance, gap rate.
  - Failure/Stops: Missing authority/license; unverifiable hashes; unresolved gaps above threshold.

- **2. Amplification/Coordination Detection**
  - Inputs: Claim/Narrative graph, account/assets, cadence logs.
  - Steps: Detect co-post/cadence motifs, URL/infrastructure reuse; apply false-positive dampeners (diversity, time-window sanity); bind confidence.
  - Outputs: Coordination alerts with lineage proofs; confidence bands.
  - KPIs: Precision@k, alert dedupe rate, verification latency.
  - Failure/Stops: Low confidence, missing provenance on signals, policy block on disallowed joins.

- **3. Fabrication Radar Triage**
  - Inputs: Media/text artifacts with metadata, provenance ledger, contradiction graph.
  - Steps: Metadata sanity (EXIF/header), provenance chain continuity, contradiction detection vs. trusted claims; flag gaps.
  - Outputs: Fabrication likelihood score + cited evidence.
  - KPIs: False-positive rate, time-to-triage, gap closure time.
  - Failure/Stops: No verifiable source, provenance discontinuity, conflicting authority tags.

- **4. Cross-Org Early Warning**
  - Inputs: Claim summaries + proofs; partner trust anchors.
  - Steps: Generate zero-knowledge/commitment proofs of claim existence + risk; exchange via partner channel; reconcile with local policy compiler.
  - Outputs: Partner-facing proofs (no PII), deconfliction alerts.
  - KPIs: Exchange latency, # zero-copy shares, PII leakage incidents (target 0).
  - Failure/Stops: Policy denies share, missing partner trust anchor, failed proof verification.

- **5. Counterfactual Response Evaluation**
  - Inputs: COA templates, risk budget, authority/licensing, impact models.
  - Steps: Simulate COAs with counterfactual uplift vs. harm; record dissent; require ombuds for high-risk; produce decision packet.
  - Outputs: Ranked COAs with harm meter, dissent log, authority proof.
  - KPIs: Time-to-COA, # COAs blocked by policy, post-action complaint rate.
  - Failure/Stops: Missing authority, harm meter above threshold without dissent/ombuds approval, unverifiable inputs.

- **6. Selective Disclosure Packager**
  - Inputs: Selected claims/evidence, audience scope, license/purpose tags.
  - Steps: Build evidence wallet with cryptographic integrity; strip non-authorized fields; add proof-of-non-collection; generate verifier bundle.
  - Outputs: Press/regulator/partner packs; revocation handles; verifier script.
  - KPIs: Verification pass rate, time-to-pack, revocation turnaround.
  - Failure/Stops: Missing citations, policy block on audience scope, failed verifier self-check.

## 5) Trust & Safety + Security Model

- **Abuse Mitigations**: Disallow content generation for manipulation; policy compiler blocks targeting/operationalization queries; export limited to evidence packs; red-team scenarios include weaponization attempts.
- **Prompt Injection/Data Poisoning Defenses**: Prompt sandboxing with allowlist tools; provenance scoring; quarantine untrusted inputs; differential analysis against known-good baselines; model card + hash pinning.
- **Policy Enforcement**: ABAC/RBAC combined with OPA-like engine; every query/export bound to authority/purpose/license/retention; unsafe operations unexecutable; reason-for-access logged.
- **Proof Artifacts**: Lineage proofs (source→transform→model/hash), reasoning trace signatures, proof-of-non-collection, verifier outputs, dissent/ombuds attestations.

## 6) Architecture

- **Services**: Ingestion (connectors, normalization, hashing), Graph Core (narrative/claim/campaign), Provenance/Claim Ledger (immutable, signed), Copilot/RAG (evidence-first), Runbook Runtime (DAG executor with proofs), Policy/Authority Compiler (OPA-like), Export Wallet + Verifier, Audit/Logging.
- **Data Model (verifiability fields)**: IDs, hashes, signatures, source URLs, timestamps, model version + parameters + card hash, transform lineage, authority tag, license tag, purpose tag, retention, confidence, risk budget, dissent references.
- **No-Copy Federation**: Exchange claim commitments + proofs, not raw data; partner verifier checks signatures/hashes; policy compiler enforces audience/purpose; privacy: no PII leaves origin, only hashed claims and attestations.
- **Offline/Edge**: Verifier and proof-carrying query replay run offline; sync uses merkle-style diff with conflict resolution favoring most recent valid signature; gaps flagged for analyst review.

## 7) Acceptance Criteria (GA-Ready)

- 0 uncited assertions in published outputs (system blocks otherwise).
- Verifier reproduces PCA/PCQ results on fixtures within tolerance; tamper triggers alarms.
- Policy/authority binding prevents disallowed joins/exports (blocked at execution time).
- Demonstrated zero-copy partner exchange with proofs only; zero PII leakage.
- Harm meter on all COAs; high-risk requires dissent + ombuds signoff.
- Time-to-first-insight and time-to-pack measurably improved vs. baseline.

## 8) Sprint Backlog (Epics → Stories → Demo Checklist)

- **Epic 1: Proof-Carrying Core**
  - Stories: Build provenance/claim ledger schema; implement proof-carrying analytics replay; "Verify" UI flow; offline verifier bundle.
  - Demo: Run analytic, download bundle, verify offline showing pass/fail diff.
- **Epic 2: Authority/Policy Binding**
  - Stories: Policy compiler enforcing authority/license/purpose; block disallowed joins/exports; reason-for-access prompts; audit log with signatures.
  - Demo: Attempt disallowed export → blocked with cited policy; allowed path succeeds with proof.
- **Epic 3: Zero-Copy Collaboration**
  - Stories: Claim commitment format; partner proof exchange; selective disclosure wallet with revocation; proof-of-non-collection report.
  - Demo: Share claim proof to partner fixture; partner verifies without PII.
- **Epic 4: Counter-Deception Analytics**
  - Stories: Amplification/cadence detector; contradiction graph; fabrication radar checks; tri-pane UI integration.
  - Demo: Show graph/timeline/map surfaces with alerts and citations.
- **Epic 5: Harm-Aware Response**
  - Stories: COA planner with harm meter; dissent capture; ombuds gate; decision pack exporter.
  - Demo: High-risk COA triggers dissent/ombuds flow; approved COA emits evidence pack.

## 9) Risks & Open Questions (Mitigations)

- **Data Access Ambiguity**: Mitigate with strict policy compiler defaults deny, and reason-for-access prompts.
- **Model Drift/Poisoning**: Pin model hashes; monitor provenance anomalies; scheduled red-team tests.
- **False Positives**: Embed dampeners and manual review gates; track precision/appeal metrics.
- **Partner Trust Anchors**: Require mutual key exchange and out-of-band verification; fallback to read-only proofs.
- **Operational Load**: Automate ingestion/runbook scheduling; provide workload SLOs and scaling hooks.

---

### Council Review Summary

- **Counterintelligence/Verification**: Ensured every analytic/export is replayable with lineage; added blocked publication on missing citations.
- **Hybrid/Cyber Resilience**: Added quarantine rules, hash pinning, merkle sync for offline resilience.
- **Strategic Deception Defense**: Focused on measurement only; no manipulation actions; risk/harm meter gating.
- **Records/Compartmentation**: Case rooms with compartments, authority/purpose binding, reason-for-access logging.
- **Ethics/Oversight**: Dissent + ombuds gates on high-risk COAs; proof-of-non-collection included in exports.
