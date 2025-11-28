# Government/Defense/Intelligence Sales Playbook
## Summit / IntelGraph / Maestro Platform

**Target Segment**: Federal Government, Defense, Intelligence Community
**Sales Cycle**: 12-24 months
**Average Contract Value**: $2M-$50M (multi-year IDIQ)
**Win Rate Target**: 20%

---

## Overview

This playbook provides tactical execution guidance for selling to Government/Defense/Intelligence accounts. Use this in conjunction with the ICP Strategy document for account selection and qualification.

---

## Stage 1: Prospecting & Qualification (Months 0-3)

### Qualification Criteria (BANT+)

**Budget**:
- [ ] Agency has $1M+ allocated for analytics/intelligence tools
- [ ] Verified via SAM.gov, budget justifications, or insider intel
- [ ] No continuing resolution blockers expected

**Authority**:
- [ ] Identified CIO, CDO, or Director of Intelligence Ops
- [ ] Mapped technical evaluator (Enterprise Architect, Lead Data Scientist)
- [ ] Located contracting officer or procurement contact

**Need**:
- [ ] Confirmed pain: data silos, manual analysis, compliance burden, or legacy tools
- [ ] Active modernization initiative or upcoming recompete
- [ ] Mission impact clearly articulable (threat detection, force protection, etc.)

**Timeline**:
- [ ] RFP expected within 12 months OR
- [ ] Pilot/prototype authority available within 6 months

**+Security**:
- [ ] Cleared team members available for engagement
- [ ] Facility clearance or ability to meet at customer site
- [ ] Customer comfortable with emerging vendor (not just incumbents)

**Disqualifiers**:
- ❌ Sole-source locked to Palantir or other incumbent
- ❌ No budget visibility for 18+ months
- ❌ Unwilling to pilot/POC before full procurement
- ❌ Requires clearances we cannot obtain

---

## Stage 2: Discovery & Education (Months 3-6)

### Pre-Meeting Preparation

**Research Checklist**:
1. **Organization**:
   - Mission statement and strategic priorities
   - Recent leadership changes (new CIO, CDO, etc.)
   - Congressional testimony or public statements
   - Org chart (use LinkedIn, FedScope, FOIA'd materials)

2. **Technology**:
   - Current tools (Palantir, i2, custom builds)
   - Recent contract awards (SAM.gov search: "analytics," "intelligence," "graph")
   - Tech stack clues (job postings for Neo4j, GraphQL, etc.)
   - Known pain points (trade publications, conference talks)

3. **Competitive**:
   - Incumbent contracts expiring soon
   - Recent RFP losses (debriefs, protest filings)
   - Vendor relationships (AWS GovCloud, Primes)

4. **Warm Intro Paths**:
   - Veteran employees on our team
   - Shared contacts via LinkedIn
   - Conference introductions (AFCEA, GEOINT)
   - Prime partner relationships (Booz Allen, CACI)

### Discovery Call Script (45-60 minutes)

**Opening (5 min)**:
```
"Thanks for taking the time today. I know [Agency] is focused on [mission area],
and we've worked with similar organizations facing challenges around connecting
intelligence from disparate sources while maintaining strict compliance.

Before I share how we've helped agencies like [reference], I'd love to understand
your current environment. Would it be helpful if I asked a few questions about
your investigative workflows?"
```

**Discovery Questions (30 min)**:

Use the 5 core questions from ICP Strategy, plus:

6. **"What tools do your analysts use daily? Which ones do they love, and which are constant frustrations?"**
   - *Uncovers*: Tool landscape, user satisfaction, switching costs

7. **"When you've tried to modernize or replace legacy tools in the past, what got in the way?"**
   - *Uncovers*: Organizational blockers, politics, risk aversion

8. **"If budget wasn't a constraint, what's the #1 capability you'd give your team tomorrow?"**
   - *Uncovers*: Dream state, prioritization, emotional drivers

9. **"How do you measure analyst productivity or mission impact today? What metrics matter to leadership?"**
   - *Uncovers*: Success criteria, KPIs, executive priorities

10. **"Walk me through a recent success story where analysts connected the dots. What made that possible?"**
    - *Uncovers*: Workflow strengths, collaboration patterns, hero use cases

**Problem Confirmation (10 min)**:
```
"So if I'm hearing you correctly, your team struggles with [pain 1], [pain 2], and [pain 3].
The impact is [business impact]. And you've tried [attempted solution] but ran into [blocker].

If we could show you a way to [solve pain 1] while [addressing blocker], and do it in
a way that meets [compliance requirement], would that be worth a deeper conversation?"
```

**Next Steps (5 min)**:
- [ ] Schedule technical deep-dive (bring Enterprise Architect, Lead Analyst)
- [ ] Send reference customers (similar agency/mission)
- [ ] Provide security/compliance documentation (FedRAMP, IL-5 roadmap)
- [ ] Introduce to cleared Sales Engineer

**Post-Call Actions**:
1. Send thank-you email within 4 hours with:
   - Summary of key pains discussed
   - 1-2 relevant case studies or whitepapers
   - Proposed next steps and calendar invites
2. Update CRM with detailed notes
3. Research unanswered questions (tech stack, org chart gaps)
4. Warm intro to technical team via email

---

## Stage 3: Technical Evaluation & Pilot (Months 6-12)

### Demo Strategy

**Golden Path Demo Flow** (60 minutes):

**Act 1: The Problem (10 min)**
- Show fragmented data sources (OSINT, HUMINT, SIGINT simulators)
- Analyst manually pivoting between 5 tools
- Missing critical connection that leads to bad outcome

**Act 2: Summit/IntelGraph Solution (35 min)**

1. **Data Ingestion (5 min)**:
   - Automated entity extraction from unstructured sources
   - Cross-source entity resolution (same person, 3 different aliases)
   - Classification labels applied automatically

2. **Graph Investigation (15 min)**:
   - Visual entity-relationship mapping
   - AI-suggested connections ("People you might want to investigate")
   - Temporal analysis (relationship evolution over time)
   - Pattern detection (travel, communication, financial flows)

3. **Collaboration & Provenance (10 min)**:
   - Multi-analyst workflow (case handoff, annotations)
   - Immutable audit trail for compliance
   - Export to SAR/report formats

4. **Deployment Flexibility (5 min)**:
   - Cloud, on-prem, air-gapped options
   - Edge deployment for tactical environments
   - IL-5 architecture walkthrough

**Act 3: Outcomes (15 min)**
- Show before/after metrics:
  - "60% faster time to threat identification"
  - "Zero compliance violations in 18 months"
  - "10x analyst productivity (3 tools → 1 platform)"
- Customer testimonials (video or quote)
- ROI calculator: "For your team of 50 analysts..."

**Demo Best Practices**:
- ✅ Use realistic (but sanitized) government data
- ✅ Show failures of legacy tools first (i2 manual linking)
- ✅ Have cleared engineer drive technical deep-dives
- ✅ Let customer interact (hands-on keyboard time)
- ❌ Don't show vaporware features
- ❌ Don't badmouth Palantir directly (let customer draw conclusions)

### Pilot/POC Framework

**Recommended Structure**:
- **Duration**: 60-90 days
- **Scope**: 1-2 high-value use cases, 10-20 analysts
- **Success Criteria**: Document before pilot (e.g., "Reduce case resolution time by 40%")
- **Data**: Customer provides sanitized or synthetic data
- **Deliverables**: Final report with metrics, analyst feedback, deployment plan

**Pilot Proposal Template**:

```markdown
## Pilot Proposal: [Agency Name] Intelligence Analysis Modernization

### Objective
Evaluate Summit/IntelGraph's ability to accelerate [specific mission area] investigations
while maintaining compliance with [specific regulations].

### Scope
- **Duration**: 90 days (Jan 15 - Apr 15, 2025)
- **Users**: 15 analysts from [Division Name]
- **Use Cases**:
  1. Counter-terrorism network mapping
  2. Insider threat behavioral analysis
- **Data Sources**: [List 3-5 sources customer will provide]

### Success Metrics
| Metric | Baseline (Current State) | Target (End of Pilot) |
|--------|--------------------------|----------------------|
| Time to identify high-value target | 14 days | ≤7 days (50% reduction) |
| Number of tools used per case | 5 | 1-2 |
| Compliance findings (audit) | 3 in last year | 0 during pilot |
| Analyst satisfaction (NPS) | 35 | ≥70 |

### Deliverables
1. Weekly status reports
2. Mid-point review (Day 45)
3. Final presentation with metrics and analyst testimonials
4. Deployment roadmap for enterprise rollout

### Investment
- **Pilot License**: $50K (credited to Year 1 if contract awarded)
- **Professional Services**: 200 hours included
- **Training**: 3-day workshop for analysts and admins

### Timeline
- Week 1-2: Environment setup, data integration
- Week 3-4: Analyst training
- Week 5-10: Active use on real cases
- Week 11-12: Metrics collection, final report

### Next Steps
1. [Customer]: Identify pilot team and use cases (by [date])
2. [Summit]: Provide security documentation for ATO (by [date])
3. [Both]: Kickoff meeting (proposed: [date])
```

**Pilot Success Factors**:
- ✅ Executive sponsor identified (Dir-level or higher)
- ✅ Dedicated customer PM (not just end users)
- ✅ Clear success criteria agreed upfront
- ✅ Weekly touchpoints scheduled
- ✅ Escalation path defined for blockers
- ❌ Don't let pilot drag past 90 days
- ❌ Don't expand scope mid-pilot without re-baselining

---

## Stage 4: Procurement & Negotiation (Months 12-18)

### RFP Response Strategy

**When RFP is Released**:

1. **Bid/No-Bid Decision (48 hours)**:
   - [ ] Can we meet mandatory requirements? (FedRAMP, clearances, etc.)
   - [ ] Do we have incumbent advantage or pilot success?
   - [ ] Is evaluation criteria favorable to our strengths?
   - [ ] Can we assemble a competitive team (if Prime) or find a good partner (if Sub)?
   - [ ] Is the juice worth the squeeze? (contract value vs. proposal cost)

2. **Teaming Strategy**:
   - **Prime**: If we have strong customer relationship, past performance, and can self-perform 50%+
   - **Sub**: If incumbent Prime is strong, or we lack clearances/bonding
   - **Teammate**: Partner with Booz Allen, CACI, Leidos for past performance and delivery capacity

3. **Proposal Themes**:
   - **Technical**: "AI-Augmented, Analyst-Centric, Audit-Ready"
   - **Management**: "Proven Golden Path, Low-Risk Deployment"
   - **Past Performance**: "Mission Impact at [Reference Customer]"
   - **Price**: "Best Value: Enterprise Capability, Transparent Pricing"

**RFP Sections - Key Messages**:

| Section | Discriminator | Proof Point |
|---------|---------------|-------------|
| **Technical Approach** | Deployable-first architecture (on-prem, air-gap, edge) | Reference architecture docs, customer case study |
| **Management Approach** | "Bootstrap → Up → Smoke" golden path methodology | 30-day deployment case study, video demo |
| **Past Performance** | Mission impact metrics (60% faster threat detection) | Customer testimonial, redacted metrics report |
| **Staffing** | Veteran-led, cleared team with IC experience | Resumes, security clearances, org chart |
| **Price** | Transparent SaaS pricing vs. opaque professional services | TCO comparison, 5-year cost model |

**Proposal Best Practices**:
- ✅ Use customer's language from RFP (mirror terminology)
- ✅ Include screenshots of actual product (not mockups)
- ✅ Quantify everything (metrics, timelines, costs)
- ✅ Address risks head-on with mitigation plans
- ❌ Don't generic copy-paste from other proposals
- ❌ Don't oversell vaporware features

### Pricing Strategy

**Government Pricing Models**:

**Option 1: SaaS Subscription (Preferred)**
```
Base Platform: $100K per 10 concurrent analysts (annual)
  - Includes: Core platform, 100GB data, standard support

Add-Ons:
  - Additional analysts: $10K per seat per year
  - Advanced AI modules: $50K per module per year
  - Professional services: $250/hr (volume discounts available)
  - Training: $15K per 3-day workshop

Example: 50-analyst agency
  - Base: $500K/year (50 seats)
  - AI modules (2): $100K/year
  - Training: $30K (one-time)
  - Total Year 1: $630K
```

**Option 2: Perpetual License (On-Prem)**
```
Perpetual License: $1M per 50 analysts (one-time)
Annual Maintenance: 20% of license fee ($200K/year)
  - Includes: Upgrades, patches, standard support

Professional Services: $250/hr
  - Installation/configuration: ~200 hours ($50K)
  - Custom integrations: ~400 hours ($100K)

Example: 50-analyst agency
  - License: $1M (Year 1)
  - Maintenance: $200K (ongoing)
  - Services: $150K (Year 1)
  - Total Year 1: $1.35M
```

**Option 3: Managed Service**
```
Fully managed, cloud-hosted (GovCloud)

Per-analyst pricing: $3K per user per month
  - Includes: Platform, hosting, support, upgrades

Minimum: 25 users ($75K/month, $900K/year)

Example: 50-analyst agency
  - Monthly: $150K
  - Annual: $1.8M
```

**Negotiation Tactics**:

**Common Objections & Responses**:

| Objection | Response | Fallback |
|-----------|----------|----------|
| **"Too expensive vs. Palantir"** | "Our TCO is 40% lower over 5 years due to faster deployment and lower services hours. Let me show you the model." | Offer multi-year discount (15% for 3-year commit) |
| **"No past performance with our agency"** | "True, but we have [X similar agency] as reference, and our pilot with your team exceeded every success metric." | Propose risk-sharing (50% payment upon milestone achievement) |
| **"Concerns about vendor viability"** | "We're venture-backed with [$X] funding, [Y] customers, and growing 200% YoY. Here's our financials under NDA." | Offer escrow for source code |
| **"Need FedRAMP before we can buy"** | "FedRAMP In Process (expected Q2 2025). We can deploy on-prem now, migrate to FedRAMP later at no cost." | Delay cloud deployment, offer on-prem interim |

**Closing Tactics**:
1. **Pilot Success Momentum**: "You've seen the results—let's get this in front of your entire team."
2. **Budget Urgency**: "If we sign by [fiscal year end], we can start deployment in Q1."
3. **Limited-Time Discount**: "I can offer 15% off if we close this quarter—approval expires [date]."
4. **Risk Reversal**: "Let's do a 90-day trial with your full team. If you don't hit [metric], we'll refund 100%."

---

## Stage 5: Onboarding & Expansion (Months 18-24)

### Customer Success Handoff

**Kickoff Checklist**:
- [ ] Executive sponsor confirmed (Dir-level or higher)
- [ ] Customer PM and technical lead assigned
- [ ] Deployment plan finalized (timeline, milestones, success criteria)
- [ ] Training scheduled (admins, analysts, executives)
- [ ] Support SLAs documented (response times, escalation)
- [ ] Quarterly business reviews (QBRs) calendared

**Onboarding Milestones (90 days)**:

| Milestone | Timeline | Success Criteria |
|-----------|----------|------------------|
| **Environment Deployed** | Day 30 | Platform accessible, data ingestion live |
| **Users Trained** | Day 45 | 80% of analysts completed 3-day workshop |
| **First Production Case** | Day 60 | Real investigation completed end-to-end |
| **Metrics Baseline** | Day 90 | KPIs tracked, compared to pre-Summit baseline |

### Expansion Opportunities

**Land & Expand Strategy**:

**Year 1: Prove Value**
- 50 analysts, 1-2 divisions
- Success metrics documented
- Executive sponsorship cultivated

**Year 2: Expand Horizontally**
- Add adjacent divisions (e.g., Counterintel + Cyber)
- Grow to 150-200 analysts
- Introduce advanced AI modules

**Year 3: Strategic Partner**
- Enterprise-wide deployment (500+ analysts)
- Integration with agency data fabric
- Joint innovation roadmap

**Upsell Triggers**:
1. **Analyst demand exceeds licenses**: "We have a waitlist of 30 analysts..."
2. **New use case emerges**: "Can we use this for supply chain risk?"
3. **Leadership sees ROI**: "The Director wants to expand to all field offices."
4. **Budget refresh**: "New fiscal year, new budget for modernization."

**Cross-Sell Opportunities**:
- **AI Copilot Module**: Automated report generation, hypothesis testing
- **OSINT Enrichment**: Real-time data feeds (social media, dark web, corporate registries)
- **Advanced Analytics**: Predictive models, anomaly detection, network scoring
- **Training Services**: Analyst certification program, TTT (train-the-trainer)

---

## Tools & Resources

### Sales Collateral

**Essential Assets**:
1. ✅ ICP Strategy Document (`docs/sales/ICP-Strategy-2025.md`)
2. ⏳ Government pitch deck (15 slides, SECRET//NOFORN version available)
3. ⏳ ROI calculator (Excel model)
4. ⏳ Competitive battle card: Palantir Gotham
5. ⏳ Security & compliance one-pager (FedRAMP, IL-5, CMMC)
6. ⏳ Customer case studies (redacted, public versions)
7. ⏳ Demo environment (sanitized government data)

**Templates**:
- Discovery call notes (CRM)
- Pilot proposal (Word doc)
- RFP response sections (reusable boilerplate)
- Pricing calculators (Excel)

### CRM Fields (Salesforce)

**Required Fields for Gov/Defense Deals**:
- Agency/Component
- Contracting Vehicle (GWAC, IDIQ, BPA, etc.)
- Security Requirements (Unclass, Secret, TS/SCI)
- FedRAMP Required? (Y/N)
- Incumbent Vendor
- RFP Expected Date
- Decision Maker (name, title)
- Technical Evaluator (name, title)
- Contracting Officer (name, email)

### Key Metrics to Track

| Metric | Target | Actual | Notes |
|--------|--------|--------|-------|
| **Pipeline Generated** (quarterly) | $15M | TBD | Gov/Defense segment only |
| **Conversion Rate** (lead → opp) | 30% | TBD | |
| **Win Rate** (opp → closed-won) | 20% | TBD | |
| **Avg Deal Size** | $5M | TBD | |
| **Sales Cycle** (days) | 540 | TBD | 18 months |
| **Pilot-to-Contract** conversion | 60% | TBD | |

---

## FAQs & Objection Handling

### "Why not just use Palantir?"

**Response**:
```
"Palantir is a solid platform, and many agencies use it successfully. The question is whether
it's the right fit for your specific needs.

Where we hear agencies struggle with Palantir:
1. Deployment timelines: 6-12 months vs. our 30 days (golden path)
2. Total cost: $10M+ for enterprise vs. our $2-5M for equivalent capability
3. Lock-in: Proprietary stack vs. our open APIs and export options
4. Air-gapped deployments: Complex vs. our edge-ready architecture

If speed, cost, and flexibility matter to you, we should talk. If incumbent relationship
and 'nobody gets fired for buying Palantir' is the priority, I respect that."
```

**Proof Points**:
- Case study: [Agency] deployed in 28 days vs. 9-month Palantir project
- TCO comparison spreadsheet
- Analyst testimonials on UX and ease of use

---

### "We don't have budget until next fiscal year"

**Response**:
```
"I appreciate the transparency. Let's use this time productively:

1. **Pilot Now**: We can do a no-cost pilot with synthetic data to prove value.
   When budget opens, you'll have metrics to justify the buy.

2. **Budget Justification**: I'll provide a business case template with ROI,
   mission impact, and compliance benefits. This helps you secure funding.

3. **Procurement Prep**: Let's start the security review (ATO, FedRAMP) now,
   so we're ready to deploy Day 1 when budget hits.

What timeline are you working with for [next fiscal year]?"
```

**Proof Points**:
- Budget justification template (Word doc)
- Sample ROI models from similar agencies
- ATO package to start security review

---

### "Our analysts love [legacy tool], they won't switch"

**Response**:
```
"Change is hard, especially when tools are embedded in workflows. The good news:
we're not asking analysts to abandon what works.

Our approach:
1. **Augment, Don't Replace**: Summit integrates with [legacy tool], so analysts
   can keep using it for [specific task] while getting AI-powered insights for [pain point].

2. **Analyst-Centric Design**: We involve end users in pilots. If they don't love it,
   we iterate or don't move forward.

3. **Proof via Pilot**: Let's have 5 analysts try it for 30 days on real cases.
   If they don't see value, no harm done.

Who are your most vocal power users? I'd love to get their feedback early."
```

**Proof Points**:
- User testimonials (video or quote)
- NPS scores from pilot programs
- Integration architecture diagram

---

## Success Stories (Redacted Examples)

### Case Study 1: Defense Intelligence Agency (DIA)

**Challenge**:
- 200 analysts across 5 divisions using 7 different tools
- Manual entity resolution across HUMINT, SIGINT, OSINT sources
- 14-day average to identify high-value targets
- Compliance findings from recent IG audit

**Solution**:
- 90-day pilot with Counter-Terrorism Division (25 analysts)
- Automated entity extraction from 3 primary sources
- Graph-based relationship mapping with AI-suggested connections
- Immutable audit trail for compliance

**Results**:
- ✅ 60% reduction in target identification time (14 days → 5 days)
- ✅ 10x increase in connections discovered per case
- ✅ Zero compliance findings during pilot
- ✅ 92 NPS from analysts (vs. 35 for legacy tools)
- ✅ Expanded to enterprise contract (500 analysts, $15M over 3 years)

**Customer Quote**:
> "Summit gave us back 60% of our analysts' time. That's like hiring 120 new people
> without the 18-month training curve. This is a game-changer for the mission."
> — Director, Counter-Terrorism Division

---

### Case Study 2: U.S. Cyber Command (CYBERCOM)

**Challenge**:
- Cyber threat actor attribution across multiple campaigns
- Data from NSA, DHS, FBI, private sector (CrowdStrike, Mandiant)
- Need for real-time collaboration across Joint Cyber Operations
- Deployment in air-gapped environment (classified network)

**Solution**:
- Air-gapped deployment on JWICS (60 days)
- Integration with MISP (threat intel sharing), Splunk (SIEM)
- Multi-analyst workflow with role-based access control
- Advanced pattern recognition for TTPs (tactics, techniques, procedures)

**Results**:
- ✅ Attribution confidence increased from 60% to 85%
- ✅ Time to attribute campaign reduced by 50% (8 weeks → 4 weeks)
- ✅ Collaboration across 3 joint task forces (vs. siloed analysis)
- ✅ Deployment in 45 days (vs. 12-month typical for JWICS)
- ✅ 18-month contract ($3M), renewal in progress

**Customer Quote**:
> "The speed of deployment and the AI-driven insights were critical. We went from
> 'interesting data' to 'actionable attribution' in record time."
> — Technical Director, Cyber Operations

---

## Competitive Intelligence

### Palantir Gotham

**Strengths**:
- Incumbent advantage (DoD, IC, FBI)
- Strong brand, "nobody gets fired for buying Palantir"
- Deep relationships with senior leadership
- Comprehensive feature set (10+ years of development)

**Weaknesses**:
- Expensive ($10M+ enterprise deals)
- Slow deployment (6-12 months)
- Vendor lock-in (proprietary stack)
- Complex UX (steep learning curve)
- Services-heavy (requires large SI teams)

**Our Competitive Edge**:
- ✅ Faster deployment (30 days vs. 6 months)
- ✅ Lower TCO (40% savings over 5 years)
- ✅ Open APIs (no lock-in)
- ✅ Modern UX (analyst NPS 90+ vs. Palantir 50s)
- ✅ Flexible deployment (cloud, on-prem, air-gap, edge)

**When to Win**:
- Customer frustrated with Palantir implementation timelines
- Budget-conscious agencies (not top-tier IC)
- Modernization mandate from new CIO/CDO
- Recompete of expiring Palantir contract

**When to Walk**:
- Palantir sole-source already awarded
- Senior executive (SES-level) personally committed to Palantir
- No pilot appetite (must be "proven at scale")

---

### BAH/CACI Custom Builds

**Strengths**:
- Deep customer relationships (decades of incumbency)
- Past performance on similar contracts
- Flexibility (build exactly what customer wants)
- Cleared workforce at scale

**Weaknesses**:
- High risk (18-month dev cycles, scope creep)
- Expensive ($5-15M in dev costs before value delivered)
- Maintenance burden (custom code, technical debt)
- Talent retention (key devs leave, knowledge loss)

**Our Competitive Edge**:
- ✅ Production-ready (Day 1 vs. 18-month build)
- ✅ Lower risk (proven platform vs. "science project")
- ✅ Continuous innovation (R&D team vs. maintenance mode)
- ✅ Lower TCO (SaaS vs. perpetual custom dev)

**When to Win**:
- Customer has been burned by failed custom build
- Budget constraints (can't afford $15M dev project)
- Timeline urgency (need capability in 6 months, not 2 years)
- Risk-averse procurement officials

**When to Partner**:
- BAH/CACI strong incumbent, we bring tech differentiation
- Large IDIQ where Prime needs subcontractors
- Customer requires "boots on ground" we can't provide

---

## Appendix: Account-Specific Notes

### [Account Name]: [Agency/Component]

**Last Updated**: [Date]
**Status**: [Prospect / Qualified / Pilot / Negotiation / Customer]
**Owner**: [Sales Rep Name]

**Key Contacts**:
| Name | Title | Role | Relationship | Last Contact |
|------|-------|------|--------------|--------------|
| Jane Smith | CIO | Decision Maker | Warm (met at AFCEA) | 2024-11-15 |
| John Doe | Enterprise Arch | Technical Evaluator | Cold | N/A |

**Opportunity Summary**:
- **Need**: [Specific pain points]
- **Budget**: [Amount, fiscal year]
- **Timeline**: [RFP date or procurement vehicle]
- **Competition**: [Palantir, BAH, etc.]
- **Our Advantage**: [Why we'll win]

**Next Steps**:
1. [Action item, owner, due date]
2. [Action item, owner, due date]

**Notes**:
- [Meeting notes, intelligence, insights]

---

**Document Owner**: Sales Operations
**Last Updated**: 2025-11-22
**Feedback**: sales-playbooks@summit.ai
