# GTM Messaging Operating System

**Version:** 1.0  
**Date:** 2025-09-02  
**Owner:** GTM PMM Lead  
**Scope:** Company-wide GTM messaging, enablement, and governance across marketing, sales, CS, and web.

---

## Objectives

- Ship a single-source-of-truth messaging system that is evidence-backed, compliant, and easy to activate across all channels.
- Increase SQL conversion, win rate, and time-to-close through consistent claims, proof, and enablement.
- De-risk public statements and competitive positioning with explicit approval workflows and fact-only talk tracks.

## Operating Principles

1. **Evidence or it doesn’t ship:** Every claim maps to a proof object (metric, customer, cert, SLA, audit, or demo).
2. **No drift:** Regulated, mid-market, and enterprise variants inherit the core house and only adjust proof and risk posture.
3. **Guardrails first:** Legal/Security review gates for high-risk or forward-looking claims; “fast lane” for low-risk reuse.
4. **Lifecycle tight loop:** Messaging, content, website, nurture, and enablement share ICPs, pain points, and outcomes.
5. **Instrument everything:** Funnel analytics and win/loss feedback drive quarterly refreshes and retirements.

---

## Workstream Blueprint

| Epic                          | Goal                                                                         | Cadence             | DRI                | Key Artifacts                                              |
| ----------------------------- | ---------------------------------------------------------------------------- | ------------------- | ------------------ | ---------------------------------------------------------- |
| 1. Messaging System           | Define ICPs, use cases, message house, claims library, and approval workflow | Monthly + Q refresh | PMM                | ICP one-pager, message house, claims library, approval SOP |
| 2. Content Production         | Template-driven content with proof, SEO, and reuse                           | Weekly sprint       | Content Lead       | Templates, editorial standards, reuse plans                |
| 3. Website & Conversion       | High-intent landing pages with proof, routing, and A/B                       | Biweekly            | Web Lead           | KPI map, landing pages, test plans                         |
| 4. Lifecycle & Nurture        | Persona/industry nurture with lead scoring                                   | Monthly             | Marketing Ops      | Nurture maps, scoring model, SLAs                          |
| 5. Sales Enablement           | Role-based decks, battlecards, demo scripts, MAPs                            | Weekly              | Enablement Lead    | Library, certification plan                                |
| 6. Pipeline by Channel        | Channel playbooks, budgets, attribution, velocity                            | Weekly              | Growth Lead        | Channel scorecards, attribution model                      |
| 7. Brand & Reputation         | Brand system, crisis playbooks, proof pipeline                               | Monthly             | Comms Lead         | Voice guide, crisis plan, review posture                   |
| 8. Customer Marketing         | Advocacy, adoption, expansion motions                                        | Monthly             | Customer Marketing | Advocacy pipeline, adoption campaigns                      |
| 9. Marketing Ops & Governance | Data model, taxonomy, compliance, dashboards                                 | Monthly             | Marketing Ops      | Data schema, dashboards, risk register                     |

---

## Core Deliverables (Epics 1–2)

### 1) ICP, Use Cases, and “Why Now” Narrative

- **ICP Criteria:** Industry (regulated/mid-market/enterprise), size, compliance posture, data residency, security sophistication, RevOps maturity.
- **Use Cases:** Investigation workspace, evidence-grade reporting, policy automation, executive command center.
- **Why Now:** AI governance requirements, provenance expectations, audit demands, and consolidation from rogue tools.
- **Output:** Single-page brief with ICP tiers, triggers, pains, value hypotheses, and proof sources.

### 2) Message House & Variants

- **House Layers:**
  - **Headline:** Outcome-first promise per ICP tier.
  - **Proof Points:** Metrics, customer references, certifications, SLA posture.
  - **Objections & Responses:** Data residency, security, ROI, lock-in.
  - **Differentiators:** AI-first + governance-first, provenance ledger, policy-driven controls, self-hostable.
- **Variants:** Regulated, mid-market, enterprise inherit the core and swap proof/controls (e.g., SOC2+FedRAMP-ready, DLP posture, data isolation patterns).
- **Output:** Message house doc + variant matrices kept in the claims library.

### 3) Claims Library (Single Source of Truth)

- **Schema:** `claim_id`, `message`, `evidence_type`, `evidence_source`, `status (approved/pending/high-risk)`, `expiry/review date`, `owner`, `channels (web/sales/content)`, `risk tier`.
- **Evidence Types:** Customer metric, quote, certification, SLA, audit artifact, security attestation, product telemetry, demo video.
- **Governance:** High-risk claims require Legal + Security approval; auto-expire on review date; only approved claims appear in web, content, and sales assets.
- **Storage:** Versioned Markdown/CSV in `docs/gtm/claims/` plus reference in CMS/enablement tools.

### 4) Approval Workflow for High-Risk Claims

- **Triggers:** Forward-looking statements, security posture, compliance coverage, performance benchmarks, competitive references.
- **Flow:** Submit → Evidence check → Legal review → Security review → PMM final → Publish to library with expiry.
- **SLAs:** High-risk 3 business days, medium 2, low-risk fast lane same-day.
- **Audit:** Log approvals with timestamp, approver, and evidence link; block publishing if expired.

### 5) Editorial Standards & Templates

- **Templates:** Blog, case study, whitepaper, webinar, docs, email. Each includes CTA, required proof, CTA placement, and visual proof tiles.
- **Standards:** Clarity, evidence, compliance (no unapproved claims), tone (pragmatic, evidence-first), accessibility (WCAG), brand voice.
- **Reuse:** Each webinar → clips, social posts, FAQ, deck, nurture emails.

### 6) Website & Conversion Guardrails

- **KPIs by Page:**
  - Home: CTR to use case/pricing, demo request rate.
  - Pricing: Plan click-through, contact rate, friction notes.
  - Use Case: CTA to demo/signup, proof engagement.
  - Security/Trust: Download rate of trust pack, SOC/SLA view depth.
- **Routing:** SMB self-serve vs enterprise contact flows; form friction tracking and drop-off alerts.
- **A/B:** Guardrails to protect brand; maintain variant library; require sample size calc.

### 7) Lifecycle & Nurture

- **Stages:** New lead → engaged → activated → SQL → customer → expansion.
- **Signals:** Behavioral (content depth, product events), firmographic (industry, size), intent (third-party where allowed).
- **Assets:** Onboarding sequences tied to aha moments; re-engagement for stalled trials; renewal/expansion plays tied to governance features.

### 8) Sales Enablement

- **Library:** Decks, demos, objection handling, security packet, battlecards, mutual action plan templates.
- **Role-Based:** SDR talk tracks, AE discovery scripts, SE demo scripts, CSM value realization and renewal plays.
- **Certification:** Bootcamp with assessments and call review rubric; forbidden phrases list enforced.

### 9) Channel & Ops

- **Channel Playbooks:** Paid search, content, events, partners, outbound, PLG with CAC/payback targets and kill thresholds.
- **Attribution:** Multi-touch with sanity checks; weekly channel review to reallocate budget.
- **Risk & Compliance:** Consent management, UTM discipline, exceptions registry with expiry.

---

## Metrics & Instrumentation

- **Conversion:** Visit → signup/demo → activation → SQL → close; tracked per page, channel, and persona.
- **Performance:** Win rate, time-to-close, pipeline velocity by channel and ICP tier.
- **Content ROI:** MQL/SQL influence, CAC impact, reuse ratio (assets per source event), time-to-publish.
- **Enablement Impact:** Deck/demo usage, certification completion, mutual action plan adoption, call review scores.
- **Governance:** Claim approval SLAs, expired claim count, rogue asset deletion rate.

---

## Cadence & Refresh

- **Weekly:** Channel review, content sprint review, enablement usage dashboard, web A/B report.
- **Monthly:** Content retro (keep/kill), ops audit (data quality, routing, attribution), nurture performance review.
- **Quarterly:** Messaging refresh from win/loss + market changes; retire outdated claims and decks; brand sentiment review.
- **Decommissioning:** Delete rogue decks/one-pagers and dead pages; track removals in the governance log.

---

## Execution Checklist (Ready-to-Run)

- [ ] Publish ICP + why-now one-pager and message house with regulated/mid-market/enterprise variants.
- [ ] Stand up claims library with approval workflow, expiry, and channel tagging.
- [ ] Ship content templates with editorial standards and reuse playbook; start case study factory intake.
- [ ] Map website KPIs, landing pages for top 10 use cases, and trust surfaces; enable A/B guardrails.
- [ ] Launch persona/industry nurture, lead scoring, and marketing-sales SLAs.
- [ ] Refresh enablement library, battlecards, and certification; enforce forbidden phrases.
- [ ] Finalize channel scorecards, attribution sanity checks, and budget reallocation rules.
- [ ] Maintain risk register, exceptions registry, and monthly marketing memo.

---

## Forward-Looking Enhancements

- **Evidence Graph:** Link claims, proof artifacts, and channels in the knowledge graph to auto-validate references and detect drift.
- **Adaptive Routing:** Use behavioral scoring to dynamically steer visitors between self-serve, guided demo, and enterprise contact flows.
- **Closed-Loop QA:** LLM-based monitoring to flag unapproved claims in web/content/sales assets before publishing.
