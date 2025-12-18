# Named Account List Template

**Purpose:** Structure for tracking target accounts across Gov/Defense/Intel, Primes/SIs, and Regulated Enterprise segments.

_Copy headers to your CRM or spreadsheet. Tags and fields align with MEDDICC qualification and the GTM Starter Pack pipeline stages._

---

## Accounts Table

### Column Headers (CSV-Ready)

```csv
Account Name,Segment,Sub-Segment,Tier,HQ City,HQ State,Parent Company,Website,Employee Count,Annual Revenue,Data Sensitivity,Deployment Preference,Contract Vehicles,Incumbent Tools,Key Pain Points,Hypothesis,Trigger Events,Account Owner,Source,Status,Notes,Last Updated
```

### Column Definitions

| Column | Description | Example Values |
|--------|-------------|----------------|
| **Account Name** | Organization name | "DHS CISA", "Booz Allen Hamilton", "JPMorgan Chase" |
| **Segment** | Primary market segment | Gov/Defense/Intel, Prime/SI, Regulated Enterprise |
| **Sub-Segment** | Specific category within segment | See sub-segment values below |
| **Tier** | Priority tier | Tier 1 (strategic), Tier 2 (priority), Tier 3 (opportunistic) |
| **HQ City** | Headquarters city | "Washington", "McLean", "New York" |
| **HQ State** | Headquarters state | "DC", "VA", "NY" |
| **Parent Company** | Parent organization (if applicable) | "Leidos" for subsidiary |
| **Website** | Primary website | "cisa.gov", "boozallen.com" |
| **Employee Count** | Approximate headcount | "1000-5000", "10000+" |
| **Annual Revenue** | Revenue band or contract value | "$1B+", "$100M-500M" |
| **Data Sensitivity** | Data classification level | Low, Medium, High, Classified |
| **Deployment Preference** | Preferred deployment pattern | Cloud, On-Prem, Air-Gap, Hybrid |
| **Contract Vehicles** | Available procurement paths | "GSA MAS", "SEWP V", "OTA", "Direct" |
| **Incumbent Tools** | Current competing solutions | "Palantir", "i2 Analyst's Notebook", "Custom" |
| **Key Pain Points** | Primary challenges (from research) | "Fragmented OSINT tools", "Audit compliance" |
| **Hypothesis** | Why Summit wins here | "Need provenance for FOIA; current tools lack audit" |
| **Trigger Events** | Signals indicating timing | "RFI released", "Budget cycle", "Leadership change" |
| **Account Owner** | Internal owner | "Felix", "AE Name" |
| **Source** | How account was identified | "Research", "Referral", "Event", "Inbound" |
| **Status** | Current engagement status | New, Researching, Outreach, Engaged, Qualified, Disqualified |
| **Notes** | Freeform notes | "Met at conference; follow up Q1" |
| **Last Updated** | Date of last update | "2025-11-27" |

---

## Segment & Sub-Segment Values

### Gov / Defense / Intel

| Sub-Segment | Description | Example Accounts |
|-------------|-------------|------------------|
| DoD Intel | Military intelligence (J2, A2, G2, N2) | USSOCOM J2, USAF 16AF, DIA |
| IC Elements | Intelligence community agencies | CIA, NSA, NGA, NRO |
| DHS Components | Homeland security missions | CISA, I&A, CBP, ICE HSI |
| FBI / DOJ | Law enforcement / counterintel | FBI Cyber, FBI CI, DEA |
| State Fusion | State/local fusion centers | VA Fusion Center, NCTC |
| Other Federal | Non-DoD/IC federal | State Dept INR, Treasury OIA |

### Primes / Systems Integrators

| Sub-Segment | Description | Example Accounts |
|-------------|-------------|------------------|
| Tier 1 Prime | Top 10 defense primes | Lockheed, RTX, Northrop, Boeing, GDIT |
| Tier 2 Prime | Mid-tier defense contractors | SAIC, Leidos, CACI, Booz Allen, BAH |
| Regional SI | Regional/specialized integrators | Jacobs, KBR, Peraton |
| Commercial SI | Commercial SIs with fed practices | Accenture Federal, Deloitte GPS |

### Regulated Enterprise

| Sub-Segment | Description | Example Accounts |
|-------------|-------------|------------------|
| FSI Threat Intel | Financial services cyber/threat intel | JPMorgan, Goldman, Citi, BofA |
| FSI Fraud | Financial services fraud teams | Visa, Mastercard, PayPal |
| Energy/Utilities | Critical infrastructure operators | Duke Energy, Dominion, Exelon |
| Healthcare | Healthcare security/compliance | Kaiser, UnitedHealth, Anthem |
| Tech Platform | Large tech platform trust/safety | (Enterprise tier only) |

---

## Contacts Table

### Column Headers (CSV-Ready)

```csv
Contact ID,Account Name,First Name,Last Name,Title,Role,Email,Phone,LinkedIn,Source,Opt-In,Engagement History,Last Contact,Next Action,Notes
```

### Column Definitions

| Column | Description | Example Values |
|--------|-------------|----------------|
| **Contact ID** | Unique identifier | "C001", auto-generated |
| **Account Name** | Linked account | "DHS CISA" |
| **First Name** | Contact first name | "Jane" |
| **Last Name** | Contact last name | "Smith" |
| **Title** | Job title | "Director of Intelligence Operations" |
| **Role** | MEDDICC role | Economic Buyer, Technical Buyer, Champion, User, Influencer, Legal/Compliance |
| **Email** | Work email | "jane.smith@agency.gov" |
| **Phone** | Work phone | "+1-202-555-0100" |
| **LinkedIn** | LinkedIn profile URL | "linkedin.com/in/janesmith" |
| **Source** | How contact was acquired | "LinkedIn", "Conference", "Referral", "Website" |
| **Opt-In** | Marketing consent | Yes, No, Pending |
| **Engagement History** | Summary of interactions | "Intro call 11/15; demo scheduled 12/1" |
| **Last Contact** | Date of last touch | "2025-11-15" |
| **Next Action** | Scheduled next step | "Send pilot proposal by 11/30" |
| **Notes** | Freeform notes | "Reports to CIO; budget authority" |

### Role Definitions (MEDDICC)

| Role | Description | Signals |
|------|-------------|---------|
| **Economic Buyer** | Final budget/signature authority | "I approve the spend" |
| **Technical Buyer** | Evaluates technical fit | "I assess the architecture" |
| **Champion** | Internal advocate, wants you to win | "I'll push this through" |
| **User** | End user of the solution | "I'll use this daily" |
| **Influencer** | Affects decision but doesn't decide | "My opinion matters" |
| **Legal/Compliance** | Reviews contracts, security, compliance | "I approve the terms" |

---

## Opportunity Tracking (Linked to Accounts)

### Column Headers (CSV-Ready)

```csv
Opportunity ID,Account Name,Opportunity Name,Amount (ARR),Stage,Close Date,Owner,Pilot?,Pilot Weeks,Procurement Path,Funding Line,Use Case,Primary Data Sources,MEDDICC Score,Win Risk,Next Step,Next Step Date,Notes
```

### Stage Values (Per GTM Starter Pack)

| Stage | Definition | Exit Criteria |
|-------|------------|---------------|
| **1. Inbound/Prospect** | Initial identification | MQL criteria met |
| **2. Qualified** | Champion + ICP fit confirmed | Intro meeting held |
| **3. Discovery** | Problem, tools, constraints understood | Discovery complete |
| **4. Pilot Proposed** | Scope + price shared | Proposal delivered |
| **5. Security Review** | Compliance/security evaluation | CFK reviewed; memo signed |
| **6. Pilot Active** | Pilot in progress | Success criteria tracked |
| **7. Business Case** | ROI/TCO approved | Sponsor sign-off |
| **8. Contracting** | Terms negotiation | Vehicle/terms agreed |
| **9. Closed Won** | Deal signed | Contract executed |
| **10. Closed Lost** | Deal lost | Reason code captured |

---

## Seed Account List (Starting Point)

### Gov / Defense / Intel (Tier 1 Strategic)

| Account Name | Sub-Segment | Hypothesis | Trigger |
|--------------|-------------|------------|---------|
| CISA JCDC | DHS Components | Multi-source threat intel fusion; need provenance for partner sharing | Cyber incident surge; budget increase |
| DHS I&A Open Source | DHS Components | OSINT modernization; replacing legacy tools | Known modernization initiative |
| USSOCOM J2 | DoD Intel | All-source fusion for SOF missions; deploy-anywhere requirement | J2 modernization programs |
| USAF 16th AF (AFCYBER) | DoD Intel | Cyber intel + OSINT fusion; policy-gated AI for targeting support | A26 analytics initiatives |
| FBI Cyber Division | FBI / DOJ | Threat intel fusion; case management integration; audit for court | Known tech refresh cycle |

### Primes / SIs (Tier 1 Strategic)

| Account Name | Sub-Segment | Hypothesis | Trigger |
|--------------|-------------|------------|---------|
| Booz Allen Hamilton | Tier 2 Prime | Multiple intel/analytics pursuits; need compliant AI substrate | Active capture season |
| SAIC | Tier 2 Prime | Intel modernization programs; graph/AI delivery acceleration | Recompete cycles |
| Leidos | Tier 2 Prime | Large intel portfolio; looking for COTS alternatives to custom builds | Post-acquisition consolidation |
| Lockheed Martin (Rotary & Mission) | Tier 1 Prime | C4ISR programs; need mission-ready AI with explainability | New program starts |
| GDIT | Tier 2 Prime | DHS/intel programs; compliance-first messaging resonates | Active pursuits |

### Regulated Enterprise (Tier 2 Priority)

| Account Name | Sub-Segment | Hypothesis | Trigger |
|--------------|-------------|------------|---------|
| JPMorgan Chase (Cyber Intel) | FSI Threat Intel | Threat intel fusion across feeds; board wants explainability | Regulatory pressure |
| Visa (Fraud Intel) | FSI Fraud | Fraud ring detection; graph analytics; audit requirements | Fraud losses increasing |
| Duke Energy | Energy/Utilities | Critical infrastructure protection; NERC CIP compliance | Infrastructure bill funding |

---

## Tags & Filters (Suggested)

### Account Tags

- `strategic-logo` — High brand value if won
- `expansion-potential` — Land-and-expand opportunity
- `partner-sourced` — Brought by partner
- `competitor-displacement` — Replacing incumbent
- `quick-close` — Short sales cycle expected
- `compliance-driver` — Compliance is primary buying trigger
- `ai-guardrails` — Policy-gated AI is key differentiator

### Trigger Event Tags

- `rfi-rfp-active` — Active solicitation
- `budget-cycle` — Fiscal year timing
- `leadership-change` — New decision maker
- `incident-breach` — Recent security incident
- `modernization-mandate` — Top-down modernization push
- `audit-finding` — Compliance gap identified
- `contract-recompete` — Incumbent contract ending

---

## Usage Notes

1. **Start with Tier 1** — Focus outreach on strategic accounts first
2. **Enrich weekly** — Add contacts, update triggers, capture engagement
3. **Score MEDDICC** — Rate each opportunity on MEDDICC dimensions (1-3 scale)
4. **Track win/loss reasons** — Capture why deals close or stall
5. **Sync to CRM** — Import to HubSpot/Salesforce; maintain single source of truth
6. **Review quarterly** — Reprioritize tiers based on market signals

---

_Version: 2025-11-27 | Aligns with GTM Starter Pack v1_
