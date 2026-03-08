# Summit Underwriting Intelligence (SUI) Governance & Product Strategy

## 1. Overview
This document serves as the Product Requirements Document (PRD) and Governance framework for Summit Underwriting Intelligence (SUI), positioning it as a superset of Orpheus Cyber.

## 2. Product Positioning: SUI vs. Orpheus
Orpheus Cyber provides insurer-grade risk scoring and vulnerability management. Summit aims to beat Orpheus by offering a strictly more powerful system characterized by:
- **Graph-Native Provenance:** Every score decomposes to graph edges, source lineage, and policy checks. Auditors can replay decisions from an immutable snapshot.
- **Agentic Underwriting Playbooks:** Instead of just a score, SUI agents generate a comprehensive underwriting packet, remediation plan, and deterministic evidence bundle.
- **Cross-Domain Intel Fusion:** Combines cyber risk, supply-chain graphs, executive impersonation, and narrative ops into a single intelligence layer.
- **Reproducible Decisions:** The SUI architecture guarantees determinism across all scoring runs, addressing the new UDR-AC benchmark.

### 2.1 Competitive Battlecards
- **Orpheus:** Claims third-party validation (e.g., Gallagher Re study) and strong underwriting workflow integration.
- **Summit SUI:** "We don't just score risk—we produce replayable decisions with provable evidence, and automate the entire underwriting and remediation loop with policy-controlled agents." SUI provides an insurer-side validation harness to reproduce portfolio results deterministically, avoiding vendor lock-in.

### 2.2 Competitor Landscape
- **Security Ratings Clusters:** BitSight, SecurityScorecard, RiskRecon, UpGuard.
- **Risk Scoring & Modeling:** CyberCube, Kovrr, Verisk, Guidewire, RMS, Cyberwrite, KYND.

## 3. Minimum Viable Product (MVP) Scope

### 3.1 Key Features
- **Deterministic Risk Scoring API (`/score`)**: Generates TIDE-like quintile lift scores (A-E).
- **Explainability API (`/explain`)**: Provides feature importance and rationale for scores.
- **Portfolio Monitoring & Drift (`/portfolio/drift`)**: Continuous tracking of portfolio risk with automated drift alerts.
- **Evidence Framework:** Core generation of `report.json`, `metrics.json`, and `stamp.json` artifacts per decision.
- **Clean-Room Subsystems:** Independent implementations of CVE exploit prediction and leaked info ingestion.

### 3.2 Workflow Redesign
Replace traditional "questionnaire + ad-hoc scans" with an agent-managed lifecycle:
- **Pre-bind:** Automated packet generation and control verification requests.
- **Post-bind:** Continuous drift alerts, automated remediation ticketing, proof collection, and updated terms at renewal.

## 4. Model Governance & Auditability
- **Model Cards:** Every model version must be accompanied by a model card outlining feature usage, known biases, performance metrics on public/synthetic proxy datasets, and intended use cases.
- **Data Governance:** Strict purpose-based access control (e.g., viewing raw leak artifacts vs. derived features) and adherence to data minimization policies for PII.
- **Immutable Snapshots:** Scoring only runs against fixed point-in-time snapshots of entity data to guarantee audit completeness.
- **Append-only Audit Logs:** All decisions, overrides, and policy evaluations are logged immutably.

## 5. Pricing & Partnerships (Assumptions to Validate)
- **Pricing Hypotheses:** (Needs Validation)
  - Subscription-based models tiered by portfolio size (e.g., 1k, 10k, 100k entities) or per-policy fee.
  - Potential tiered service levels (SaaS-only vs. SaaS + Analyst Support).
- **Validation Plan:** Request Orpheus insurer pricing deck/MSA template, gather broker quotes, and map typical ACVs.
- **Partnership Strategy:** Build integration rails with TPRM platforms (e.g., Aravo) and cyber insurance marketplaces (e.g., Limit) to enable seamless data exchange via REST/Webhooks.

## 6. Pilot & Validation Experiments
- **Experiment 1:** Run the SUI evaluation harness on at least one public/proxy dataset to verify quintile separation (lift curve) and predictive capability without unacceptable false positives.
- **Experiment 2 (Insurer Pilot):** Partner with an insurer to review an anonymized portfolio study (pre/post binding decisions and claims outcomes) to measure loss ratio improvement using SUI features versus baseline.
- **Experiment 3:** Conduct broker workflow tests to measure analyst time saved per underwriting packet (steps/tasks reduced) using SUI's agentic playbooks.

## 7. Go/No-Go Decision Gates
- **Post PR-3 (TIDE-like Scoring):** Do we achieve credible lift on at least one open/public proxy dataset?
- **Post Insurer Pilot:** Do we achieve meaningful quintile separation on real claims data without excessive false positives?
