# 12-MONTH EXECUTION PLAN: Seven Businesses, One Platform

## Executive Summary

You have the technical foundation (verification API + datasets). Now you need:

1. **Unified technical architecture** supporting all 7 businesses
2. **Sequenced hiring** (who, when, what order)
3. **Clear shipping roadmap** (what gets built, by whom, when)
4. **The 7th business**: Government verification marketplace (civic tech)

**By Month 12**: $30-50M ARR across 7 businesses, 35-person team, unified platform ready for Series A or strategic acquisition.

***

## PART 1: The Unified Technical Architecture

### Current State (Summit Infrastructure)

Your existing `summit` repository likely contains:

- Core verification API (claim extraction, evidence retrieval, verdict aggregation)
- Database (PostgreSQL for claims, Redis for caching)
- Celery workers (async task processing)
- Basic web UI or API endpoints

### Target State: Multi-Product Platform Architecture

```text
┌──────────────────────────────────────────────────────────────────┐
│                     API GATEWAY (Kong/nginx)                      │
│             Single entry point, auth, rate limiting               │
└──────────────────────────────────────────────────────────────────┘
                              ↓
┌──────────────────────────────────────────────────────────────────┐
│                  SHARED SERVICES LAYER                            │
│  ┌──────────────┬────────────────┬──────────────┬──────────────┐│
│  │ Auth Service │  Billing API   │ Analytics    │ Notification ││
│  │ (JWT/OAuth)  │  (Stripe)      │ (Posthog)    │ (SendGrid)   ││
│  └──────────────┴────────────────┴──────────────┴──────────────┘│
└──────────────────────────────────────────────────────────────────┘
                              ↓
┌──────────────────────────────────────────────────────────────────┐
│                 CORE VERIFICATION ENGINE                          │
│  ┌──────────────────────────────────────────────────────────────┐│
│  │ Claim Extraction  │ Evidence Retrieval │ Verdict Aggregation ││
│  │ (Gemini 2.5)      │ (FAISS + Search)   │ (NLI Cross-Encoder)││
│  └──────────────────────────────────────────────────────────────┘│
│  ┌──────────────────────────────────────────────────────────────┐│
│  │ Deepfake Detection│ Multimodal (Vision)│ ESG Verification   ││
│  │ (Face Forensics)  │ (Gemini Vision)    │ (Domain-specific)  ││
│  └──────────────────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────────────────┘
                              ↓
┌──────────────────────────────────────────────────────────────────┐
│              PRODUCT-SPECIFIC APIs (Microservices)                │
│  ┌──────────┬──────────┬──────────┬──────────┬──────────────┐  │
│  │FactFlow  │FactLaw   │FactMarkets│FactAPI  │FactCert      │  │
│  │(Newsroom)│(Legal)   │(Financial)│(Platform)│(Certification)│  │
│  └──────────┴──────────┴──────────┴──────────┴──────────────┘  │
│  ┌──────────┬──────────┐                                        │
│  │FactData  │FactGov   │                                        │
│  │(Datasets)│(GovTech) │                                        │
│  └──────────┴──────────┘                                        │
└──────────────────────────────────────────────────────────────────┘
                              ↓
┌──────────────────────────────────────────────────────────────────┐
│                    DATA LAYER                                     │
│  ┌─────────────────┬──────────────────┬──────────────────────┐ │
│  │ PostgreSQL       │ Redis Cache      │ Vector DB (Pinecone) │ │
│  │ (Claims,Users)   │ (Verifications)  │ (Evidence Search)    │ │
│  └─────────────────┴──────────────────┴──────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

### Key Architectural Decisions

#### 1. Modular Monolith → Microservices (Gradual Migration)

- **Months 1-6**: Keep everything in monolith; add product-specific API routes
- **Months 7-12**: Extract FactMarkets (financial) as first microservice (highest revenue, most specialized)
- **Year 2**: Extract remaining products as separate services

**Why start monolith**: Faster development, easier debugging, shared code reuse. Microservices add complexity you don't need until >$10M ARR. [precallai](https://precallai.com/multi-tenant-saas-microservices-architecture)

#### 2. Multi-Tenancy: Schema-Per-Tenant

- Each customer (newsroom, law firm, financial institution) gets isolated database schema
- Share verification cache across tenants (verified claims are universal)
- Tenant ID propagates through every API request (JWT token contains tenant_id)

#### 3. Shared Verification Engine

- All 7 products call same core verification API
- Product-specific customizations via feature flags (FactLaw gets deepfake detection; FactFlow gets live transcription)
- Single truth for accuracy metrics across all products

***

## PART 2: Hiring Roadmap (Months 0-12)

### Hiring Philosophy

**Seed to 10 engineers (Months 0-6)**: Technical founders + generalists [bvp](https://www.bvp.com/atlas/scaling-your-engineering-team-from-one-to-50-and-beyond)
**Series A (Months 7-12)**: Specialists in sales, product, ops [sifted](https://sifted.eu/articles/series-a-startup-hiring-roadmap)

### Month 0-1: Founding Team (You + 3 Initial Hires)

#### Hire 1: Founding Engineer / Tech Lead ($180-220K + 1-2% equity)

- **Who**: Senior full-stack engineer (8+ years), built 0→1 products before
- **Responsibilities**:
  - Owns core verification API architecture
  - Sets engineering standards (code review, CI/CD, testing)
  - Hands-on: writes 60% of code in Months 1-4
- **Hire from**: Your network, Y Combinator founder referrals, AngelList

#### Hire 2: Product Manager ($160-200K + 0.5-1% equity)

- **Who**: Technical PM with B2B SaaS experience (newsroom/legal/fintech helpful but not required)
- **Responsibilities**:
  - Owns product roadmap for all 7 businesses
  - Customer discovery (talk to 100+ potential customers in Months 1-3)
  - Prioritization (which products ship first, what features cut)
  - **Critical**: Needs to understand verification domain quickly
- **Hire from**: Ex-product managers from Stripe, Figma, Linear

#### Hire 3: Sales Engineer / Founding Sales ($140-180K + 0.5-1% equity + commission)

- **Who**: Technical seller who can demo product, close deals, and give feedback to eng
- **Responsibilities**:
  - First 10 customers across all products
  - Build sales playbook (discovery call scripts, demo flows, pricing objections)
  - Customer success until Month 6
- **Hire from**: Ex-sales engineers from Databricks, Snowflake, Retool

### Months 2-4: Core Engineering Team (Add 3-4 Engineers)

#### Hire 4: Backend Engineer ($150-180K + 0.3-0.5% equity)

- **Focus**: Verification engine optimization (latency, accuracy, cost)
- **Skills**: Python, PostgreSQL, Redis, Celery, API design

#### Hire 5: Frontend Engineer ($140-170K + 0.3-0.5% equity)

- **Focus**: Build dashboards for FactFlow (newsroom), FactLaw (legal)
- **Skills**: React, TypeScript, WebSocket (real-time updates), responsive design

#### Hire 6: ML Engineer ($160-200K + 0.3-0.5% equity)

- **Focus**: Fine-tune verification models, adversarial testing, dataset curation
- **Skills**: PyTorch, HuggingFace Transformers, LLM fine-tuning, NLP

#### Hire 7 (Optional): DevOps Engineer ($140-170K + 0.2-0.4% equity)

- **Focus**: CI/CD, Kubernetes setup, monitoring (Prometheus/Grafana), cost optimization
- **When to hire**: If team is blocked on infra; otherwise, use managed services (Render, Railway, Fly.io) until Month 6

### Months 5-6: Product-Specific Hires (Add 2-3)

#### Hire 8: Domain Expert (Legal or Financial) ($120-160K + 0.2-0.3% equity)

- **Focus**: FactLaw OR FactMarkets (whichever ships first)
- **Why**: Need someone who speaks the language (legal = eDiscovery; financial = compliance)
- **Example**: Ex-paralegal, ex-financial analyst, ex-compliance officer

#### Hire 9: Customer Success Manager ($100-140K + 0.2-0.3% equity)

- **When**: After first 20 paying customers
- **Focus**: Onboarding, renewals, upsells, support tickets
- **Prevents**: Churn >10%

### Months 7-9: Scale Sales + Ops (Add 4-5)

#### Hire 10-11: Account Executives (2x) ($120-150K + 0.1-0.2% equity + 20% OTE)

- **Focus**: Enterprise sales (FactMarkets financial institutions, FactLaw law firms)
- **Quota**: $500K ARR per AE by Month 12

#### Hire 12: Head of Operations / Chief of Staff ($140-180K + 0.3-0.5% equity)

- **When**: Team >15 people; founder overwhelmed
- **Focus**: Hiring, budgeting, board decks, contracts, vendor management

#### Hire 13: Data Engineer ($150-180K + 0.2-0.3% equity)

- **Focus**: FactDatasets (synthetic data generation), data pipelines, ETL
- **Skills**: Airflow, dbt, Spark, data warehousing

#### Hire 14: Security Engineer ($160-200K + 0.2-0.3% equity)

- **When**: First enterprise customer asks for SOC2
- **Focus**: SOC2 compliance, penetration testing, security audits

### Months 10-12: Specialize + Scale (Add 3-4)

#### Hire 15: Head of Marketing ($160-200K + 0.3-0.5% equity)

- **When**: Product-market fit proven (>$2M ARR)
- **Focus**: Content, SEO, paid acquisition, brand, events
- **Prevents**: Sales team spending 50% time generating leads

#### Hire 16-17: Junior Engineers (2x) ($120-150K + 0.1-0.2% equity)

- **Focus**: Support senior engineers, own small features
- **Why**: Senior engineers drowning in work

#### Hire 18: Partnerships Manager ($130-170K + 0.2-0.3% equity)

- **Focus**: FactAPI Pro (platform partnerships), FactCert (validator recruitment)
- **Profile**: Ex-BD from Stripe, Twilio, or similar API-first company

***

## PART 3: Product Shipping Roadmap (Months 0-12)

### Principles

1. **Ship one product at a time** (no parallel launches until Month 6)
2. **Launch = 5-10 paying customers** (not "perfect product")
3. **Iterate weekly** based on customer feedback

### Phase 1: Foundation (Months 0-3)

#### Month 1: Core Verification API + FactAPI Pro MVP

- **Goal**: Developers can call verification API via REST
- **Ships**: API endpoint (POST /verify), documentation, 3 SDKs (Python, JS, cURL)
- **Team**: Founding engineer + 1 backend engineer
- **Validation**: 10 developers sign up, make 1,000 verification calls

#### Month 2: FactFlow MVP (Newsroom SaaS)

- **Goal**: 3 beta newsrooms using live fact-checking dashboard
- **Ships**: Live transcription integration (Whisper API), claim extraction, real-time dashboard
- **Team**: Founding engineer + frontend engineer + PM
- **Validation**: 3 newsrooms pay $500-2K/month pilot deals

#### Month 3: FactDatasets Pilot

- **Goal**: Generate first synthetic dataset, license to 1 customer
- **Ships**: SynDy-style claim paraphrasing, 10K verified claims with variants
- **Team**: ML engineer + data engineer
- **Validation**: 1 customer pays $50-100K for dataset license

### Phase 2: Revenue Acceleration (Months 4-6)

#### Month 4: FactLaw MVP (Legal eDiscovery)

- **Goal**: 2 law firms using evidence authentication module
- **Ships**: Deepfake detection, AI-generation detection, Relativity plugin
- **Team**: Founding engineer + backend engineer + domain expert (legal)
- **Validation**: 2 law firms pay $10-30K/month

#### Month 5: FactMarkets MVP (Financial Verification)

- **Goal**: 1 financial institution pilot
- **Ships**: Earnings call verification, ESG claims audit, real-time guidance fact-checking
- **Team**: ML engineer + backend engineer + domain expert (financial)
- **Validation**: 1 institution pays $50-100K/month pilot

#### Month 6: FactAPI Pro Marketplace Launch

- **Goal**: 100 developers, $10K MRR
- **Ships**: Developer portal (Stripe billing, API keys, usage dashboard)
- **Team**: Backend engineer + frontend engineer
- **Validation**: 100 signups, 50K verifications/month

### Phase 3: Scale + Certification Moat (Months 7-9)

#### Month 7: FactCert MVP (Certification Program)

- **Goal**: 50 certified validators enrolled
- **Ships**: Online curriculum (40 hours), final exam, digital certification badge
- **Team**: PM + ops lead + curriculum contractor
- **Validation**: 50 validators certified, 10 paying $500 each

#### Month 8: Scale FactMarkets (Financial)

- **Goal**: 5 financial institutions, $500K MRR
- **Ships**: Multi-language support, regulatory compliance packages (DSA, SEC)
- **Team**: 2 AEs (sales) + backend engineer + security engineer (SOC2)
- **Validation**: $500K MRR (5 institutions × $100K/month average)

#### Month 9: FactGov MVP (Government Marketplace)

- **Goal**: 2 government agencies pilot
- **Ships**: Cooperative procurement integration, vendor vetting, compliance documentation
- **Team**: Partnerships manager + PM + backend engineer
- **Validation**: 2 agencies sign pilot contracts ($50-100K each)

### Phase 4: Consolidation + Optimization (Months 10-12)

#### Month 10: Platform Consolidation

- **Goal**: Unified billing, unified auth, unified analytics across all products
- **Ships**: Single login for customers using multiple products, cross-product analytics dashboard
- **Team**: DevOps engineer + backend engineer + frontend engineer

#### Month 11: Series A Prep

- **Goal**: Metrics package for investors
- **Ships**: Board deck, data room, financial model, demo environment
- **Team**: Ops lead + PM + founder

#### Month 12: Scale Everything

- **Goal**: Hit $30-50M ARR run rate, 25-35 person team
- **Focus**: Sales execution (AEs closing deals), customer success (prevent churn), engineering (ship features fast)

***

## PART 4: THE SEVENTH BUSINESS — **FactGov: Government Verification Marketplace**

### The Insight

Governments desperately need verified technology vendors but lack procurement infrastructure to evaluate startups. **Civic Marketplace** (TXShare partnership) just proved this model works. [businesswire](https://www.businesswire.com/news/home/20251106756735/en/Civic-Marketplace-and-CivStart-Ventures-Announce-Strategic-Partnership-to-Accelerate-Local-Government-Procurement-from-Startups)

**FactGov = The trusted marketplace for government agencies to procure verification + AI tools.**

### Why This Is The Perfect 7th Business

1. **Regulatory mandate**: Federal/state/local governments required to document verification methodology (DSA equivalent, but US-focused)
2. **Enormous TAM**: $50B+ annual government IT procurement; <20% uses cooperative contracts (untapped opportunity) [businesswire](https://www.businesswire.com/news/home/20251106756735/en/Civic-Marketplace-and-CivStart-Ventures-Announce-Strategic-Partnership-to-Accelerate-Local-Government-Procurement-from-Startups)
3. **Natural fit**: Your verification API + certification network (FactCert validators) = trusted government vendor ecosystem
4. **Long contracts**: Government contracts = 3-5 year deals, $500K-5M per agency
5. **Defensive moat**: First-mover in "verification as civic infrastructure"

### Product Definition

**FactGov = Three-sided marketplace:**

```text
Side 1: Government Agencies (Buyers)
  → Need: Verified technology vendors (fact-checking, deepfake detection, ESG verification)
  → Pain: Can't evaluate 1,000+ vendors; fear of fraud/waste; procurement is slow (6-18 months)

Side 2: Verified Vendors (Sellers = You + Partners)
  → Your products: FactFlow, FactLaw, FactMarkets, FactAPI, FactCert, FactDatasets
  → Partner products: Complementary tools (OCR, translation, analytics) that integrate with your API
  → Pain: Can't navigate government procurement; locked out of $50B market

Side 3: FactCert Validators (Trust Layer)
  → Role: Audit vendors, verify claims, provide independent assessment
  → Revenue: 5-10% commission on contracts they validate
```

### Revenue Model

**Government pays FactGov**: 10-15% platform fee on all transactions
**Vendors pay FactGov**: Annual listing fee ($5-25K/year) to appear in marketplace
**Validators earn**: 5% of contract value for vendor audits

**Example economics**:

- Government agency procures $1M verification contract via FactGov
- FactGov keeps: $100-150K (10-15% platform fee)
- Validator earns: $50K (5% audit fee)
- Vendor receives: $850K (net payment)

**Year 1 projection**:

- 10 agencies × $500K average contract = $5M GMV (gross merchandise value)
- FactGov revenue: $500K-750K (10-15% take rate)

**Year 3 projection**:

- 100 agencies × $1M average = $100M GMV
- FactGov revenue: $10-15M

### Go-to-Market

**Month 1-3**: Partner with existing cooperative (TXShare, Michigan Municipal Services Authority)

- Pitch: "We bring verified AI/verification vendors to your network"
- Leverage their 500+ member agencies

**Month 4-6**: Direct outreach to 50 agencies (federal, state, local)

- Focus: Agencies with DSA-equivalent requirements (fraud detection, misinformation response)

**Month 7-9**: Build vendor network (onboard 20-50 complementary vendors)

- Requirement: All vendors must use FactCert-certified validators for audits

**Month 10-12**: Scale via partnerships (GovTech accelerators, CivStart Ventures model)

***

## PART 5: Financial Summary (Month 12)

| Business | Revenue (Month 12 MRR) | Customers | Team |
| :--- | :--- | :--- | :--- |
| **FactFlow** (Newsroom) | $125K | 25 | 3 |
| **FactLaw** (Legal) | $200K | 20 | 3 |
| **FactMarkets** (Financial) | $1.5M | 10 | 5 |
| **FactAPI Pro** (Marketplace) | $100K | 2K devs | 2 |
| **FactDatasets** (Licensing) | $100K | 3 | 2 |
| **FactCert** (Certification) | $150K | 500 validators | 3 |
| **FactGov** (Government) | $50K | 2 agencies | 2 |
| **TOTAL** | **$2.225M MRR** | — | **20** |

**Annual Run Rate**: $26.7M ARR
**Gross Margin**: 85%+
**Burn Rate**: $500K/month (salaries + infra)
**Runway**: 18+ months (assuming $10M seed round)

***

## PART 6: Key Risks & Mitigations

| Risk | Likelihood | Mitigation |
| :--- | :--- | :--- |
| **Hiring too fast** (>35 people by Month 12) | Medium | Cap at 25-30; use contractors for non-core |
| **Product sprawl** (shipping too many half-baked products) | High | Ship 1 product/month; require 5 customers before "launch" |
| **Platform consolidation** (Meta/Google build native verification) | Medium | FactCert moat (own validators); B2B focus (enterprises need third-party credibility) |
| **Regulatory changes** (DSA weakens; no fact-checking mandate) | Low | Diversify across industries (newsroom, legal, financial, gov) |
| **Team burnout** (7 products = insane workload) | High | Hire aggressively Months 6-9; founders delegate ruthlessly |

***

## Conclusion

**You have the technical foundation. Now execute.**

**By Month 12**:

- $27M ARR across 7 businesses
- 25-person team (engineering, sales, ops)
- Unified platform (one codebase supporting all products)
- Defensible moat (FactCert validator network)
- Ready for Series A ($30-50M raise) or strategic acquisition ($200-300M)

**The hardest part**: Saying no. You'll want to add Business #8, #9, #10. Don't. Seven is the max. After Month 12, pick the top 3 performers and double down. Kill or sell the bottom 2.

This is your roadmap. Ship it.
