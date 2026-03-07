# 8-Week Enterprise Governance & Execution Plan

This execution plan synthesizes organizational, operational, research, and long-horizon moat initiatives (Items 208–230) into a focused 8-week roadmap. It organizes the work across four primary swimlanes: **Security/Safety**, **Product/Analyst**, **GTM (Go-to-Market)**, and **Infra/Gov**.

## Swimlanes Overview

* **Security/Safety:** Evaluation, compliance, assurance, and guardrails.
* **Product/Analyst:** Graph capabilities, long-horizon moats, and research.
* **GTM:** External alignment, customer onboarding, and pilot feedback.
* **Infra/Gov:** Org cadence, execution flywheel, and process institutionalization.

## Week 1: Foundations & Org Alignment

### Infra/Gov

* **[208] Single Program Board:** Stand up a single Summit "program board" that pulls from GitHub Projects 19, Linear SUM, Jira KAN, and the Notion roadmap so prioritization happens once.
* **[209] Weekly Tactics Ritual:** Define a 60–90 minute weekly tactics ritual that reviews only risks, blockers, and evidence gaps tied to the roadmap.
* **[230] Explicit "Stop Doing" List:** Define activities, experiments, and surface areas deliberately avoided this year to keep Summit’s focus tight.

### Security/Safety

* **[211] "Production-Ready" Definition:** Create a single definition for Summit (SLOs, evidence, coverage, safety checks) and gate all GA work through it.

### Product/Analyst

* **[215] Summit Scorecard:** Track 5–7 top-line metrics (investigations per analyst, MTTR, false-positive rate, evidence completeness, cost per investigation).

### GTM

* **[228] Living Playbook:** Start a living "Summit playbook" document that references only implemented, demonstrable capabilities (no aspirational fluff).

## Week 2: Execution Rigor & Baseline Truth

### Infra/Gov

* **[210] Architecture Review Cadence:** Establish a biweekly architecture review for cross-repo changes (IntelGraph, Maestro, CompanyOS, Switchboard).
* **[212] Lightweight RFCs:** Introduce lightweight RFCs for non-trivial schema, policy, or agent-behavior changes with time-boxed review.

### Security/Safety

* **[214] "Truth" Corpus:** Build a small corpus of hand-labeled OSINT cases to regression-test Analyst Assist, ER, and Risk-GNN.

### Product/Analyst

* **[217] Canonical Threat Ontology:** Start an ontology for Summit/IntelGraph (actors, campaigns, infra, narratives) aligned to STIX but optimized for agent workflows.

### GTM

* **[221] Buyer Checklists Mapping:** Map Summit’s controls against key buyer checklists (CISOs’ AI governance, OSINT evidence governance) and close obvious gaps early.

## Week 3: Guardrails, Doctrine & Feedback

### Infra/Gov

* **[224] Executable Doctrine:** Turn the DIRK/IntelGraph doctrine into checklists tied directly to CI/CD and runbooks (no doctrine that isn’t executable).

### Security/Safety

* **[213] Eval Suite Design:** Design a Summit eval suite for key workflows (triage, investigation, disinfo mapping), with task sets, rubrics, and target scores.

### Product/Analyst

* **[220] Explanation Primitives:** Develop explanation primitives (graph paths, policies, model rationales) that can be consistently rendered in UI, API, and evidence.

### GTM

* **[225] Pilot Feedback Loop:** Build a feedback loop from pilots back into roadmap (every lighthouse pilot must generate at least 3 backlog items and 3 evidence items).

## Week 4: External Assurance & Onboarding

### Infra/Gov

* **[227] Post-Mortem Rule:** Institutionalize a "post-mortem or it didn't happen" rule: any incident or major near-miss must produce changes in policies, code, or evidence.

### Security/Safety

* **[223] Trust & Safety Note:** Draft a Summit "trust and safety" note for customers explaining what is done, bounded autonomy, and risk level configurations.

### Product/Analyst

* **[216] Model-Swap Experiments:** Establish experiments for local LLMs (Llama variants) with cost/latency/quality comparisons wired into dashboards.

### GTM

* **[226] "First 90 Days" Guide:** Create a "first 90 days with Summit" guide for new customers and internal teams to stand up safe, valuable workflows quickly.

## Week 5: Safety Stress-Testing & Moat Development

### Infra/Gov

* **[229] Hiring & Onboarding Evidence:** Make evidence review a standard part of hiring and onboarding for engineers and analysts who touch Summit.

### Security/Safety

* **[222] Security Review Prep:** Prepare a lightweight external security review (friendly red team or advisor) focused on Summit’s agent stack and graph exposure paths.

### Product/Analyst

* **[218] Pattern Learning Layer:** Define a cross-tenant "pattern learning" layer that learns structural patterns (not raw data) for better detections while preserving isolation.

### GTM

* Review progress on Pilot Feedback Loop [225] and update Living Playbook [228] with newly implemented capabilities.

## Week 6: Advanced Capabilities & Security Audit

### Infra/Gov

* Assess effectiveness of Architecture Reviews [210] and RFC flow [212], iterating on the cadence and formats as necessary.

### Security/Safety

* **[222] Execute Security Review:** Conduct the lightweight external security review with the designated red team or advisor.

### Product/Analyst

* **[219] Counter-Disinfo (Part 1):** Invest in counter-disinfo capabilities focusing heavily on stance detection and initial graph modeling.

### GTM

* Incorporate Trust & Safety note [223] insights into public-facing marketing and compliance materials.

## Week 7: Graph Maturity & Playbook Solidification

### Infra/Gov

* Audit the "Production-Ready" definitions [211] against the newly operationalized CI/CD checklists [224].

### Security/Safety

* Validate the automated Eval Suite [213] using the established "Truth" Corpus [214].

### Product/Analyst

* **[219] Counter-Disinfo (Part 2):** Expand counter-disinfo capabilities to include narrative clustering and cross-platform propagation patterns.

### GTM

* Finalize the "First 90 Days" Guide [226] and ensure full alignment with the Living Playbook [228].

## Week 8: Full Execution Flywheel Integration

### Infra/Gov

* Run a retrospective on the Weekly Tactics Rituals [209] and the efficacy of the Post-Mortem Rule [227].

### Security/Safety

* Integrate the findings from the External Security Review [222] into the backlog and Architecture Review [210] agenda.

### Product/Analyst

* Finalize and deploy Model-Swap Experiments [216] to dashboards and complete the implementation of Explanation Primitives UI [220].

### GTM

* Launch canonical Buyer Checklists Mapping [221] to sales teams alongside the matured GTM onboarding guides.
