# Cash-Now SKU SOW Templates

Each section below is a ready-to-send Statement of Work (SOW) that can be customized with client specifics. Replace bracketed text (e.g., `[Client Name]`) before delivery. Every SOW assumes a two-week first slice with optional expansion modules noted under "Upsell Path".

---

## POL-01 — Policy Bundle & OPA Quickstart

**Client:** `[Client Name]`  
**Effective Date:** `[Date]`

### Objectives
- Deploy a production-ready Open Policy Agent (OPA) Attribute-Based Access Control starter across GitHub, Slack, and HTTP proxy surfaces.
- Operationalize twelve baseline policies covering PII handling, secret management, and data residency requirements.

### Scope & Deliverables
1. **Environment Readiness** – Provision GitHub, Slack, and proxy integrations with sandbox validation.
2. **Policy Baseline** – Import and tailor the twelve baseline policies to client context; document policy intent and triggers.
3. **Control Attestation Pack** – Provide policy map, enforcement screenshots, and change management plan.
4. **Enablement Workshop** – 90-minute live session with recording and admin quick-reference guide.

### Timeline
- **Week 1:** Integration setup, baseline policy deployment, dry-run enforcement tests.
- **Week 2:** Policy tuning, evidence capture, enablement workshop, final attestation delivery.

### Pricing & Payment Terms
- $4,000 setup fee invoiced at signing.
- $1,500 monthly subscription beginning at go-live.

### Assumptions & Client Responsibilities
- Client provides admin access to GitHub, Slack, and relevant proxy endpoints within 2 business days.
- Existing identity provider supplies necessary attributes for ABAC rules.

### Acceptance Criteria
- All twelve baseline policies enforced in target environments with documented evidence.
- Policy change workflow agreed upon and logged in Maestro or equivalent system.

### Upsell Path
- Position AI Audit Trail (AIG-01) for end-to-end policy observability.
- Offer Privacy Gateway (PRIV-01) for sensitive data routing.

---

## OPS-01 — Metrics Pack & Live Ops Page

**Client:** `[Client Name]`  
**Effective Date:** `[Date]`

### Objectives
- Publish an investor-grade live metrics page with provenance controls.
- Automate daily exports covering MRR, churn, and latency SLOs.

### Scope & Deliverables
1. **Source Integration Audit** – Validate metric sources (billing, product analytics, infra telemetry).
2. **Live Metrics Page** – Configure read-only dashboard with provenance badges and access controls.
3. **Export Automation** – Schedule daily metric export to client-selected destination.
4. **Metrics Narrative** – Provide framing doc for investors/executives referencing metrics definitions.

### Timeline
- **Week 1:** Source audit, dashboard scaffolding, access provisioning.
- **Week 2:** Export automation, QA, narrative briefing.

### Pricing & Payment Terms
- $3,000 setup fee due at execution.
- $1,000 monthly subscription starting at launch.

### Assumptions & Client Responsibilities
- Client furnishes API keys/read-only access to metric systems within 3 business days.
- Metrics definitions agreed prior to dashboard publication.

### Acceptance Criteria
- Dashboard accessible to authorized stakeholders with provenance indicators functioning.
- Successful automated export for three consecutive days.

### Upsell Path
- Offer Deal-Room (INV-01) to package diligence artifacts.
- Pitch Exec Dispatch (DEC-01) for ongoing leadership reporting.

---

## CVM-01 — Customer Value Memo Generator

**Client:** `[Client Name]`  
**Effective Date:** `[Date]`

### Objectives
- Automate creation of persuasive "Why Now" memos backed by IntelGraph evidence.
- Provide reusable templates and workflow for pilot planning and ROI calculations.

### Scope & Deliverables
1. **Input Playbook** – Define required deal data fields and integrations (CRM, IntelGraph).
2. **Memo Generator Setup** – Configure template logic linking claims, pilot plan, and ROI calculator.
3. **Pilot Run** – Produce six memos for priority opportunities with client validation.
4. **Usage Guide** – Deliver walkthrough and governance checklist for ongoing memo creation.

### Timeline
- **Week 1:** Input playbook, template configuration, first memo draft review.
- **Week 2:** Produce remaining memos, finalize ROI calculator, enablement session.

### Pricing & Payment Terms
- $2,000 setup fee upfront.
- $500 monthly platform fee; $250 per memo beyond six per month billed in arrears.

### Assumptions & Client Responsibilities
- Client grants access to CRM/intelligence sources and provides customer references.
- Stakeholders are available for 48-hour feedback cycles on memo drafts.

### Acceptance Criteria
- Six approved memos with linked claims and ROI calculations.
- Client team trained to generate additional memos without vendor support.

### Upsell Path
- Position RFP Answering (SALES-02) for deal desk acceleration.
- Recommend Portfolio Review (OPS-01) for executive visibility.

---

## INC-01 — Incident Lite & Postmortem Pack

**Client:** `[Client Name]`  
**Effective Date:** `[Date]`

### Objectives
- Establish a rapid response pathway from pager alert to customer-ready postmortem.
- Provide tooling to capture timelines, artifacts, and blameless narratives.

### Scope & Deliverables
1. **Runbook Wiring** – Connect pager events to Maestro incident workflow with stakeholder routing.
2. **Timeline Capture Toolkit** – Deploy bots/scripts to record chat, commits, and changes.
3. **Postmortem Template** – Customize blameless template and evidence bundle exports.
4. **Customer Assurance Package** – Assemble sample incident report with sanitized data.

### Timeline
- **Week 1:** Runbook integration, timeline capture validation.
- **Week 2:** Template finalization, mock incident drill, evidence bundle delivery.

### Pricing & Payment Terms
- $2,500 setup fee upon SOW signature.
- $1,000 monthly retainer covering up to three incidents; $500 per additional incident invoiced monthly.

### Assumptions & Client Responsibilities
- Client provides access to paging, chat, and ticketing systems.
- Incident commanders available for tabletop exercise.

### Acceptance Criteria
- Mock incident completed with full timeline capture and postmortem delivery within 48 hours.
- Evidence bundle template approved by customer success/legal stakeholders.

### Upsell Path
- Suggest Risk & Ethics Memo (GRC-02) for executive briefings.
- Add SLO Guardrails (SRE-01) for proactive reliability posture.

---

## SRE-01 — SLO Guardrails & Canary Policy

**Client:** `[Client Name]`  
**Effective Date:** `[Date]`

### Objectives
- Reduce release risk by codifying canary criteria and automated rollback triggers.
- Establish repeatable release checklist with attestation trail.

### Scope & Deliverables
1. **SLO Review** – Confirm target service levels and error budgets.
2. **Canary Blueprint** – Configure canary analysis tooling with success/failure thresholds.
3. **Auto-Rollback Config** – Implement rollback automation in deployment pipeline.
4. **Release Checklist** – Publish attested checklist and reporting cadence.

### Timeline
- **Week 1:** SLO validation, canary blueprint drafting, environment instrumentation.
- **Week 2:** Auto-rollback testing, checklist rollout, leadership sign-off.

### Pricing & Payment Terms
- $3,000 setup fee due at kickoff.
- $1,000 monthly service fee covering guardrail monitoring.

### Assumptions & Client Responsibilities
- Deployment tooling supports automated rollbacks (e.g., Argo, Spinnaker, GitHub Actions).
- Client assigns release owners for checklist attestation.

### Acceptance Criteria
- Successful canary release with documented pass/fail thresholds.
- Signed release checklist for two deployments.

### Upsell Path
- Promote SBOM/SLSA (SEC-02) for supply chain security.
- Reinforce Incident Pack (INC-01) for incident preparedness.

---

## DRM-01 — Data Room Indexer with Watermarking

**Client:** `[Client Name]`  
**Effective Date:** `[Date]`

### Objectives
- Centralize fundraising and diligence documentation with embedded provenance.
- Enable share tracking through watermarking and access logs.

### Scope & Deliverables
1. **Document Intake** – Audit and categorize existing diligence assets.
2. **Index Page Build** – Launch canonical index with dynamic access controls and watermarking.
3. **Provenance Chips** – Attach IntelGraph-backed provenance chips to key documents.
4. **Usage Analytics** – Configure logging dashboard for investor access.

### Timeline
- **Week 1:** Document intake, index scaffolding, watermark templates.
- **Week 2:** Provenance linking, analytics verification, stakeholder training.

### Pricing & Payment Terms
- $3,500 one-time implementation fee.
- $500 monthly hosting and maintenance.

### Assumptions & Client Responsibilities
- Client provides source documents and ownership metadata.
- Legal/finance approvers review sharing policies within 5 business days.

### Acceptance Criteria
- Index live with watermarking and access logging validated via test account.
- Stakeholder sign-off on provenance coverage for priority documents.

### Upsell Path
- Offer Deal-Room (INV-01) for investor orchestration.
- Add Disclosure Pack (DP-01) for compliance narratives.

---

## GRC-03 — Vendor Intake & DPIA Helper

**Client:** `[Client Name]`  
**Effective Date:** `[Date]`

### Objectives
- Automate vendor intake through to DPIA/DTIA draft generation.
- Provide risk scoring and mitigation tracking for new vendors.

### Scope & Deliverables
1. **Intake Form** – Configure vendor submission form with required data elements.
2. **Risk Calculator** – Implement scoring logic including regulatory flags.
3. **DPIA Drafting** – Generate three DPIA drafts with data flow diagrams and mitigations.
4. **Governance Workflow** – Define approval routing and evidence storage.

### Timeline
- **Week 1:** Intake form deployment, risk calculator logic validation.
- **Week 2:** DPIA draft production, governance workflow documentation, handoff session.

### Pricing & Payment Terms
- $5,000 setup fee on signature.
- $2,000 monthly retainer including up to three DPIAs; additional DPIAs scoped separately.

### Assumptions & Client Responsibilities
- Client designates legal/privacy approvers for weekly review cadence.
- Access to architecture diagrams and vendor inventories provided.

### Acceptance Criteria
- Three DPIAs delivered and approved by privacy team.
- Governance workflow operational with audit trail.

### Upsell Path
- Add Privacy Gateway (PRIV-01) for runtime enforcement.
- Extend with Policy Bundle (POL-01) for broader control coverage.

---

## AIE-01 — LLM Evaluation Harness with Receipts

**Client:** `[Client Name]`  
**Effective Date:** `[Date]`

### Objectives
- Quantify LLM feature quality improvements with transparent receipts.
- Provide cost and latency insights alongside rubric scoring.

### Scope & Deliverables
1. **Test Set Definition** – Align on representative prompts and expected outcomes.
2. **Harness Deployment** – Stand up evaluation runner with rubric configuration.
3. **Receipts Ledger** – Generate claim ledger capturing quality deltas, costs, and latency histograms.
4. **Decision Brief** – Summarize ship/hold/kill recommendation backed by data.

### Timeline
- **Week 1:** Test set curation, harness deployment in staging.
- **Week 2:** Evaluation cycles, ledger production, decision workshop.

### Pricing & Payment Terms
- $4,000 setup fee on commencement.
- $1,500 monthly platform fee; $0.10 per test over 20,000 per month billed monthly.

### Assumptions & Client Responsibilities
- Client provides API access to model endpoints and relevant prompts.
- Evaluation owners available for scoring rubric calibration.

### Acceptance Criteria
- Baseline vs. candidate model comparison with statistically significant outputs.
- Decision brief reviewed by product leadership with next steps logged.

### Upsell Path
- Pair with AI Audit Trail (AIG-01) for runtime observability.
- Add Redaction Proxy (AIG-01) for sensitive data handling.

---

## VRM-02 — Security Questionnaire Library & Portal

**Client:** `[Client Name]`  
**Effective Date:** `[Date]`

### Objectives
- Accelerate enterprise security reviews with reusable answer bank and portal automations.
- Embed provenance references to reduce follow-up cycles.

### Scope & Deliverables
1. **Answer Library Build** – Curate and normalize responses for top 10 buyer portals.
2. **Portal Automations** – Configure upload/batch submission workflows per portal.
3. **Provenance Linking** – Attach IntelGraph citations to high-scrutiny answers.
4. **Response Playbook** – Document response SLAs, escalation paths, and review cadence.

### Timeline
- **Week 1:** Answer library drafting, portal credential setup.
- **Week 2:** Automation testing, provenance linking, playbook delivery.

### Pricing & Payment Terms
- $6,000 setup fee due at kickoff.
- $2,000 monthly subscription; $150 per questionnaire beyond 15 per month invoiced monthly.

### Assumptions & Client Responsibilities
- Client supplies historical questionnaires and approved responses.
- Security lead participates in weekly review session.

### Acceptance Criteria
- At least two portals fully automated end-to-end.
- Answer library approved and catalogued with provenance references.

### Upsell Path
- Position SOC2-lite (GRC-01) for audit readiness.
- Offer SBOM/SLSA (SEC-02) for supply chain assurances.

---

## SALES-03 — Sales Asset Watermarker & Claim Chips

**Client:** `[Client Name]`  
**Effective Date:** `[Date]`

### Objectives
- Safeguard distributed sales assets with contextual provenance and watermarking.
- Equip sales teams with claim-linked collateral for buyer confidence.

### Scope & Deliverables
1. **Asset Inventory** – Catalog priority decks and collateral for watermarking.
2. **Watermark Engine** – Configure automated watermark application tied to recipient metadata.
3. **Claim Chip Integration** – Embed IntelGraph claim chips on key slides.
4. **Usage Playbook** – Provide instructions for uploading, sharing, and revoking assets.

### Timeline
- **Week 1:** Asset intake, engine configuration, initial watermark tests.
- **Week 2:** Claim chip rollout, final QA, enablement session for sales team.

### Pricing & Payment Terms
- $1,500 setup fee at execution.
- $400 monthly subscription.

### Assumptions & Client Responsibilities
- Client shares approved messaging and references for claim validation.
- Sales operations designates owner for ongoing asset governance.

### Acceptance Criteria
- Watermarked assets successfully distributed with traceable access logs.
- Claim chips resolve to live IntelGraph nodes.

### Upsell Path
- Cross-sell RFP Answering (SALES-02) for extended deal support.
- Offer Customer Value Memo (CVM-01) for personalized follow-up packages.

---

## WL-01 — Partner SI White-Label Kit

**Client:** `[Partner Name]`  
**Effective Date:** `[Date]`

### Objectives
- Enable partner to deliver co-branded DP-01, SEC-02, and VRM-01 offerings within two weeks.
- Establish revenue-share model and guardrails for pricing and delivery quality.

### Scope & Deliverables
1. **Co-Branding Package** – Provide editable collateral, proposal templates, and brand usage guide.
2. **Delivery Runbooks** – Supply step-by-step implementation guides for DP-01, SEC-02, VRM-01.
3. **Pricing Guardrails** – Define minimum pricing, revenue-share structure, and escalation triggers.
4. **Partner Enablement** – Conduct certification workshop and designate success manager.

### Timeline
- **Week 1:** Collateral delivery, runbook walkthrough, pricing alignment.
- **Week 2:** Enablement workshop, first joint opportunity review, success plan handoff.

### Pricing & Payment Terms
- Option A: $0 setup with 30% revenue share on partner-delivered work.
- Option B: $8,000 annual license with 10% revenue share.

### Assumptions & Client Responsibilities
- Partner commits to quarterly pipeline review and quality metrics reporting.
- Joint brand usage follows provided guidelines.

### Acceptance Criteria
- Partner certified to deliver all three packs with documented runbooks.
- Signed revenue-share schedule and governance cadence.

### Upsell Path
- Offer certification bundles or territory exclusives for high-performing partners.

---

## OPS-03 — Backlog-to-Decision Groomer

**Client:** `[Client Name]`  
**Effective Date:** `[Date]`

### Objectives
- Transform backlog review into decision-focused ritual with accountable owners.
- Automate reminders tied to Definition of Done (DoD) and decision nodes.

### Scope & Deliverables
1. **Workflow Design** – Map weekly grooming ritual and stakeholder roles.
2. **Decision Node Configuration** – Implement tooling to capture decisions, owners, and DoD.
3. **Reminder Automation** – Configure notifications for overdue decisions.
4. **Playbook Delivery** – Provide facilitation guide and reporting template.

### Timeline
- **Week 1:** Workflow mapping, decision node configuration, pilot session.
- **Week 2:** Automation rollout, reporting template finalization, training.

### Pricing & Payment Terms
- $2,000 setup fee payable at start.
- $800 monthly service fee.

### Assumptions & Client Responsibilities
- Client grants access to backlog tooling (Jira, Linear, etc.).
- Product/ops leads commit to weekly cadence.

### Acceptance Criteria
- Two grooming sessions completed with decision nodes captured.
- Reminder automation triggers for overdue items.

### Upsell Path
- Recommend Exec Dispatch (DEC-01) for leadership alignment.
- Offer Portfolio Review (OPS-01) for portfolio-wide visibility.

---

## ID-01 — Access Review & Step-Up Auth Starter

**Client:** `[Client Name]`  
**Effective Date:** `[Date]`

### Objectives
- Streamline quarterly access reviews and introduce step-up authentication for privileged actions.
- Provide audit-ready evidence for SOC2/ISO-lite programs.

### Scope & Deliverables
1. **Access Snapshot** – Aggregate roles and resource mappings into reviewable dataset.
2. **Review Workflow** – Configure attestation process with reminder cadence.
3. **Step-Up Auth Pilot** – Enable WebAuthn step-up for identified privileged actions.
4. **Audit Pack** – Deliver evidence bundle including review logs and control narratives.

### Timeline
- **Week 1:** Data aggregation, workflow configuration, WebAuthn integration in staging.
- **Week 2:** Pilot review cycle, production rollout, audit pack delivery.

### Pricing & Payment Terms
- $3,000 setup fee upon engagement.
- $1,000 monthly subscription for ongoing reviews and step-up maintenance.

### Assumptions & Client Responsibilities
- Client provides directory access and policy definitions for privileged actions.
- Reviewers commit to completing attestations within agreed SLA.

### Acceptance Criteria
- Completed access review with documented approvals/denials.
- Step-up authentication enforced for at least two privileged workflows.

### Upsell Path
- Expand to Policy Bundle (POL-01) for broader control coverage.
- Add Privacy Gateway (PRIV-01) for sensitive data pathways.

---

## MKT-01 — Content Provenance for Marketing

**Client:** `[Client Name]`  
**Effective Date:** `[Date]`

### Objectives
- Close AI content credibility gaps with source-linked marketing assets.
- Deliver signed exports suitable for regulated buyer scrutiny.

### Scope & Deliverables
1. **Pipeline Assessment** – Review current content workflow and tooling.
2. **Citation Chip Setup** – Embed source citation chips across blog/assets pipeline.
3. **Signed Export Process** – Automate generation of signed outputs with tamper evidence.
4. **Governance Guide** – Document review/approval process and retention policy.

### Timeline
- **Week 1:** Pipeline assessment, citation chip integration in staging.
- **Week 2:** Signed export automation, governance guide delivery, enablement session.

### Pricing & Payment Terms
- $2,500 setup fee invoiced at kickoff.
- $750 monthly subscription.

### Assumptions & Client Responsibilities
- Marketing operations provides CMS access and approved source repositories.
- Legal/compliance reviewers participate in final approval.

### Acceptance Criteria
- At least three assets published with citation chips and signed exports.
- Governance guide approved by marketing leadership.

### Upsell Path
- Add Sales Asset Watermarker (SALES-03) for downstream collateral control.
- Offer Deal-Room (INV-01) for investor-ready marketing proofs.

---

## REF-01 — Customer Reference & Proof Hub

**Client:** `[Client Name]`  
**Effective Date:** `[Date]`

### Objectives
- Centralize accepted proofs (packs, SBOMs, DPIAs) for quick buyer sharing.
- Track access via shareable tokens with revocation control.

### Scope & Deliverables
1. **Artifact Audit** – Curate existing proofs and categorize by buyer need.
2. **Proof Hub Build** – Launch gallery with tokenized access and auditing.
3. **Approval Workflow** – Define process for adding/updating artifacts with quality gates.
4. **Sales Enablement** – Provide usage guide and quick-reference sheet for GTM teams.

### Timeline
- **Week 1:** Artifact audit, hub scaffolding, token mechanics.
- **Week 2:** Workflow rollout, enablement session, first buyer-ready bundle delivered.

### Pricing & Payment Terms
- $2,000 setup fee at contract signature.
- $600 monthly service fee.

### Assumptions & Client Responsibilities
- Client supplies validated artifacts and owner contacts.
- Sales operations leads adopt hub usage within two weeks.

### Acceptance Criteria
- Proof hub live with at least five artifacts and functioning token access.
- Sales enablement session completed with recorded walkthrough.

### Upsell Path
- Cross-sell Metrics Pack (OPS-01) for live performance context.
- Introduce Investor Auto-Pack (INV-01) for fundraising motions.

---

## Bundled Offer SOW Snapshots

Customize these addenda when selling bundle motions.

### GOV-S — Governance Starter
- **Composition:** DP-01, SEC-02, DEC-01 executed concurrently.
- **Pricing:** $5,000 setup + $3,500/mo (20% discount baked in).
- **Focus:** Establish governance command center and security posture attestation. Align milestones across compliance documentation (DP-01), supply chain hardening (SEC-02), and executive decision workflows (DEC-01).
- **Key Additions:** Shared steering cadence, integrated evidence locker, expansion plan into POL-01/GRC-03.

### ENT-R — Enterprise Ready
- **Composition:** GRC-01, POL-01, VRM-02.
- **Pricing:** $12,000 setup + $5,000/mo.
- **Focus:** Enterprise trust foundation covering governance, policy, and buyer questionnaire acceleration. Highlight cross-stream dependencies and unified reporting cadence.
- **Key Additions:** Exec sponsor alignment, joint milestone tracker, optional SOC2-lite addendum.

### FR-F — Fundraise Fast
- **Composition:** INV-01, DRM-01, OPS-01.
- **Pricing:** $8,000 one-time + $1,500/mo until fundraising close.
- **Focus:** Rapid diligence readiness with investor updates, live metrics, and central data room.
- **Key Additions:** Term-based subscription (auto sunsets at close + 30 days), investor comms calendar, reference to REF-01 upsell.

### LLM-SAFE — LLM Safeguard
- **Composition:** AIG-01, AIE-01, PRIV-01.
- **Pricing:** $7,000 setup + $3,000/mo.
- **Focus:** Safe LLM deployment across monitoring, evaluation, and privacy enforcement.
- **Key Additions:** Shared risk register, escalation pathways, optional extension into POL-01.

---

### Global Commercial Guardrails
- Maintain ≥70% gross margin across all engagements.
- Treat pilots as $10–25k fixed-fee deliverables; introduce change orders after 12 hours variance.
- Default to GitHub-only access footprint in week one unless expansion fees collected.
- Documentation promises process adherence, not customer data accuracy.

Use these SOW templates with the price sheet to accelerate contracting without sacrificing clarity or margin.
