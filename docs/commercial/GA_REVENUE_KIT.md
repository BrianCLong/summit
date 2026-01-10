# Summit GA Revenue Kit

**To:** Field, Sales, Customer Success
**From:** Felix ("The B.I.Z."), VP Sales
**Date:** Oct 2025
**Subject:** v2.0.0 GA - Commercial Activation Pack

This kit provides the core artifacts to close 3 Paid Pilots and expand them to Production contracts in the next 30 days.

---

## 1. Paid Pilot Offer (SOW-lite)

**Product:** Summit Governance Pilot (SKU: `PILOT-GOV-01`)
**Price:** $15,000 (Fixed Fee)
**Duration:** 6 Weeks

### Objectives
1.  **Prove Compliance Readiness:** Generate a SOC2-ready evidence pack and SBOM for one critical service.
2.  **Demonstrate Operational Control:** Implement policy-based guardrails (ABAC/OPA) for one workflow.
3.  **Validate Value:** Deliver a "Cost & Risk" impact report showing projected annual savings.

### Scope
*   **In-Scope:**
    *   Deployment of Summit v2.0.0 (SaaS or VPC).
    *   Integration with 2 data sources (e.g., GitHub, AWS/k8s).
    *   Configuration of 1 OPA policy bundle (e.g., Release Gate or Secret Scan).
    *   Generation of 1 "Evidence Bundle" (Snapshot of compliance posture).
*   **Out-of-Scope:**
    *   Custom connector development.
    *   Full historical data migration (>30 days).
    *   Professional Services beyond 20 hours of advisory.

### Success Criteria (Acceptance Tests)
1.  **Security Gate Live:** Pull Requests in the target repo are automatically scanned, and policy violations block merge (Evidence: GitHub Status Check screenshot).
2.  **Audit Trail Verified:** A complete lineage graph (Code → Build → Deploy) is queryable in IntelGraph for the pilot service (Evidence: IntelGraph Screenshot/Export).
3.  **Evidence Pack Delivered:** A zip archive containing SBOM, signed provenance, and policy decision logs is generated (Evidence: File download).

### Timeline
*   **Week 1:** Kickoff & Access Provisioning.
*   **Week 2:** Connector setup & Data Ingest.
*   **Week 3:** Policy configuration & "Shadow Mode" (logging only).
*   **Week 4:** Enforcement Mode & Evidence Generation.
*   **Week 5:** Executive Briefing & Value Report.
*   **Week 6:** Commercial Conversion (Go/No-Go).

### Pilot-to-Prod Expansion
*   *If success criteria are met, customer agrees to convert to "Team" or "Business" annual subscription with first month credited.*

---

## 2. Pricing & Packaging (GA)

**Philosophy:** Land with "Team" compliance, Expand to "Enterprise" governance.

| Tier | **Team** | **Business** | **Enterprise** |
| :--- | :--- | :--- | :--- |
| **Ideal For** | Startups, Single Teams | Mid-Market, Multi-Team | Regulated Industries, Gov/Prime |
| **Price** | **$2,500 / mo** | **$6,000 / mo** | **Custom** (Starts at $45k/yr) |
| **User Seats** | Up to 25 | Up to 250 | Unlimited |
| **Workspaces** | 1 | 5 | Unlimited |
| **Connectors** | Standard (GitHub, Slack) | + Database (Postgres, Neo4j) | + Custom / Legacy |
| **Data Retention** | 30 Days | 1 Year | 7 Years (WORM Compliance) |
| **Deployment** | Multi-tenant SaaS | Isolated Tenant (VPC Peering) | Air-Gapped / On-Prem |
| **Support** | Community + Email | 8x5 Business Hour | 24x7 Priority + TAM |
| **Key Feature** | Basic Lineage Graph | OPA Policy Enforcement | Custom Policy + FedRAMP Pack |

**Discount Policy:**
*   **Annual Pre-pay:** 20% discount.
*   **Multi-year (3yr):** 30% discount + fixed price lock.
*   **Design Partner:** Additional 15% in exchange for public case study.

---

## 3. Security & Compliance Evidence Pack Checklist

**Customer-Facing Message:** *"We don't just fill out questionnaires; we provide cryptographic proof of our posture. Here is our Evidence Pack."*

### The "Fast Path" Review Artifacts
*(Links point to public or NDA-gated repository artifacts)*

1.  **Architecture & Threat Model:**
    *   [Architecture Overview](docs/ARCHITECTURE.md)
    *   [Threat Model (STRIDE)](docs/security/THREAT_MODEL.md)
    *   [Data Sensitivity & Redaction Policy](docs/governance/data-sensitivity-and-redaction.md)

2.  **Compliance Controls (SOC 2 Mapping):**
    *   [SOC 2 Control Matrix](docs/compliance/soc2_control_matrix.md) - Maps our controls to TSC criteria.
    *   [Public Assurance Memo](docs/assurance/PUBLIC_ASSURANCE_MEMO.md) - Our transparency commitment.

3.  **Software Supply Chain (The "Hard Stuff"):**
    *   **SBOM:** We provide a CycloneDX SBOM for every release (see `sbom.json` in Release artifacts).
    *   **Provenance:** All artifacts are signed (Cosign) with SLSA v0.2 attestations.
    *   **Secrets Policy:** [Secrets Management Standard](docs/security/secrets-policy.md) - No hardcoded secrets, rotation policy.

4.  **Operational Security:**
    *   **TLS Policy:** [TLS 1.2+ Enforcement](docs/security/TLS_POLICY.md).
    *   **Vulnerability Management:** Daily scans (Trivy/Grype), "Zero Critical" SLA.
    *   **Incident Response:** [Public Assurance Memo](docs/assurance/PUBLIC_ASSURANCE_MEMO.md) covers transparency.

5.  **Privacy & Data Governance:**
    *   [Privacy Policy & Redaction](docs/governance/data-sensitivity-and-redaction.md) - How we handle PII (Redact-by-default).

---

## 4. One-Page Exec Value Brief

**Headline:** **"Summit: The Operating System for Trust & Governance"**

**Who it's for:** CTOs, CISOs, and VPs of Engineering who are drowning in compliance toil and blind to software supply chain risks.

**The Problem:** You have 50+ tools (GitHub, Jira, Cloud, Snyk, etc.) but no single source of truth. Audits take weeks of manual screenshotting. Policy enforcement is scattered and reactive.

**The Summit Solution:** A graph-based governance platform that connects your SDLC data, enforces policy-as-code (OPA), and automates compliance evidence.

### 3 Key Outcomes
1.  **Audit Readiness on Demand:** Reduce SOC 2 / FedRAMP evidence collection time by 90%.
2.  **Guardrails, Not Gates:** Enforce security policies (e.g., "No critical vulns in Prod") automatically at PR time, without slowing down devs.
3.  **Total Visibility:** A queryable graph of your entire software estate—from code commit to cloud deployment.

### 5 Differentiators
1.  **Graph-Native:** We don't just log events; we link them. See the blast radius of a vulnerability across all your services instantly.
2.  **Policy-as-Code (OPA):** Standard, open-source policy language. No proprietary lock-in.
3.  **Cryptographic Provenance:** Every action is signed and recorded. Tamper-evident audit trails.
4.  **Air-Gap Ready:** Built for the most secure environments (Gov/Defense) from Day 1.
5.  **Multi-Modal:** Combines human decisions (Decisions Log) with automated telemetry.

### 3 Concrete Use Cases
1.  **Gov/Intel:** **"Continuous ATO"** – Automate the generation of SSP artifacts and validate controls in real-time for rapid authorization.
2.  **Regulated Enterprise (FinTech/Health):** **"Data Sovereignty"** – Trace PII flow across microservices and enforce redaction policies before data leaves a boundary.
3.  **Prime/SI:** **"Supply Chain Integrity"** – Validate 3rd-party vendor code against SBOMs and signatures before integration.

---

## 5. Outbound Kit

### Email 1: The "Hair on Fire" (Target: CISO / VPE)
**Subject:** 90% less time on SOC 2 evidence?
**Body:**
> [Name],
>
> Most CISOs I speak with dread the "evidence collection" sprint before an audit. It’s manual, expensive, and distracts Engineering.
>
> Summit (v2.0 GA) automates this. We connect to your stack (GitHub, AWS, etc.) and build a real-time "Governance Graph."
>
> **Result:** Continuous compliance evidence, generated automatically.
>
> We’re selecting 3 partners for a 6-week "Paid Pilot" to prove we can automate your next audit cycle.
>
> Worth a 15-min look at the evidence pack?
>
> Felix
> VP Growth, Summit

### Email 2: The "Operator" (Target: DevSecOps Lead)
**Subject:** OPA at scale (without the headache)
**Body:**
> [Name],
>
> Writing OPA policies is easy. Managing them across 50 repos and enforcing them without breaking builds is hard.
>
> Summit v2.0 gives you a centralized policy control plane. Enforce "No Critical Vulns" or "Require Peer Review" across your entire org, with a unified audit trail.
>
> We just dropped our GA Release with a "Security Evidence Pack" that handles the heavy lifting.
>
> Can I send you the Pilot specs?
>
> Felix

### Email 3: The "Mission" (Target: Prime Capture Lead / Gov Program Mgr)
**Subject:** Continuous ATO evidence for [Program Name]
**Body:**
> [Name],
>
> I see you're pursuing [Opportunity/Agency]. The biggest friction point we see in these capture efforts is verifying the supply chain integrity of the proposed software stack.
>
> Summit is an "Air-Gap Native" governance platform that provides real-time, cryptographic proof of software provenance and security controls. We help Primes deliver a "Continuous ATO" posture from Day 1.
>
> We have a "Pilot Offer" designed for rapid evaluation in pre-proposal or early execution phases.
>
> Open to a brief on how we support Gov/Defense assurance?
>
> Felix

### LinkedIn Message 1 (Short & Direct)
> "Hey [Name], saw you're scaling [Company]. If you're hitting that painful 'compliance vs. velocity' wall, check out Summit v2.0. We automate the governance layer so you can ship fast safely. Open to a quick feedback chat?"

### LinkedIn Message 2 (Partnership Focused)
> "[Name], noticed your team advises on [Cloud/Security] transformations. We often see a gap between 'strategic advice' and 'tooling to enforce it.' Summit provides the graph-based governance layer that makes your policy recommendations sticky. We're launching a Partner Pilot track—interested in seeing if it fits your playbook?"

### Voicemail Script (30s)
> "Hi [Name], this is Felix from Summit. We’ve built a platform that automates software governance and compliance evidence—basically killing the 'audit scramble.' We're opening 3 pilot slots this month for teams that want to modernize their SOC 2 or FedRAMP posture. Give me a call back at [Number] if you want to see the pilot scope. Thanks."

---

## 6. Target List Blueprint

### ICP (Ideal Customer Profile)
*   **Segment:** B2B SaaS (Series B-D) or GovTech/Defense Contractors.
*   **Tech Stack:** Modern Cloud Native (K8s, AWS/Azure, GitHub).
*   **Trigger Event:** Upcoming SOC 2 renewal, FedRAMP preparation, or recent security incident.
*   **Role:** CISO, VP Engineering, Director of Platform/DevOps.

### Named Account Selection Rubric (Score 0-5)
1.  **Regulated Industry?** (FinTech, Health, Defense = +2)
2.  **Recent Funding?** (Growth pressure = +1)
3.  **Job Postings?** (Hiring "Compliance" or "Security Engineer" = +1)
4.  **Public Outage/Incident?** (Need for governance = +1)

### Partner-First Route
1.  **Boutique Security Consultancies:** They implement SOC 2; we give them the tool to maintain it.
2.  **Managed DevOps Providers:** They manage infra; we add the governance layer as a value-add.
3.  **Cloud Marketplaces (AWS/Azure):** Frictionless procurement for Enterprise.
4.  **Audit Firms (The "Big 4"):** (Longer term) Certification partners.
5.  **VC Platform Teams:** Intro to portfolio companies prepping for exit/IPO.

---

## 7. 30-Day Execution Plan

**Goal:** 3 Signed Pilots | Pipeline Target: $150k (weighted)

### Weekly Goals
*   **Week 1:** Build Target List (25 Accts). Send 75 Outbound touches. **Goal: 5 Meetings.**
*   **Week 2:** First Demos. Refine Pilot Pitch. Activate Partner Network. **Goal: 3 Qualified Opps.**
*   **Week 3:** Proposal/SOW Reviews. Security "Fast Path" validation. **Goal: 1 Signed Pilot.**
*   **Week 4:** Close remaining Pilots. Handoff to Customer Success. **Goal: 3 Signed Pilots.**

### Daily Routine
*   **09:00 - 10:30:** Prospecting & Outbound (Deep Work).
*   **10:30 - 12:00:** Follow-ups & Admin.
*   **13:00 - 15:00:** Demos & Discovery Calls.
*   **15:00 - 16:00:** Content/Asset refinement (Tailoring the kit).
*   **16:00 - 17:00:** Pipeline Review & Planning.

### What I Need from Eng/Product (Nice-to-Have)
1.  **"Demo Mode" toggle:** A flag to populate the UI with safe, realistic sample data for demos (Impact: Higher conversion demo-to-pilot).
2.  **One-Click Report Export:** Button to download the "Evidence Pack" zip directly from the UI (Impact: "Wow" factor).
3.  **Connector Status Dashboard:** Simple Green/Red lights for Pilot integrations (Impact: Reduced troubleshooting time).
4.  **Pilot Telemetry:** Daily email digest of Pilot user activity (Impact: Proactive CSM intervention).
5.  **Marketing Site Update:** Update pricing page to reflect "GA" tiers (Impact: Credibility).
