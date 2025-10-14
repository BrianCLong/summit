# Cash-Now Product Price Sheet

The following catalogue summarizes the ready-to-ship SKUs that can be launched within two weeks. Each listing includes ideal customer profile (ICP), pricing, expected gross margin (GM), and natural expansion paths.

## Core SKUs

| SKU | Offer | Ideal Customer Profile | Pricing | Gross Margin | Included | Upsell Paths |
| --- | ----- | ---------------------- | ------- | ------------ | -------- | ------------ |
| **POL-01** | Policy Bundle & OPA Quickstart | Sub-100 person SaaS teams; agencies building LLM-powered workflows | $4,000 setup + $1,500/mo | ~85% | Drop-in OPA ABAC starter (GitHub, Slack, HTTP proxy) plus 12 baseline policies covering PII, secrets, data residency | AI Audit Trail (AIG-01), Privacy Gateway (PRIV-01) |
| **OPS-01** | Metrics Pack & Live Ops Page | Seed–Series B SaaS teams preparing for fundraising or enterprise deals | $3,000 setup + $1,000/mo | ~90% | Hosted live metrics page (MRR, churn, latency SLOs) with provenance badges and daily export | Deal-Room (INV-01), Exec Dispatch (DEC-01) |
| **CVM-01** | Customer Value Memo Generator | Founder-led sales teams and systems integrators | $2,000 setup + $500/mo; $250 per memo after 6 | ~95% | Auto-generated one-pagers linking IntelGraph claims, pilot plan, and ROI calculator | RFP Answering (SALES-02), Portfolio Review (OPS-01) |
| **INC-01** | Incident Lite & Postmortem Pack | SaaS teams with customer SLAs | $2,500 setup + $1,000/mo; $500 per incident beyond 3/month | ~85% | Pager-to-Maestro automation, timeline capture, blameless template, and customer-facing evidence bundle | Risk & Ethics Memo (GRC-02), SLO Guardrails (SRE-01) |
| **SRE-01** | SLO Guardrails & Canary Policy | Teams shipping weekly releases | $3,000 setup + $1,000/mo | ~90% | Pre-baked canary criteria, auto-rollback configuration, release checklist, and attestation trail | SBOM/SLSA (SEC-02), Incident Pack (INC-01) |
| **DRM-01** | Data Room Indexer with Watermarking | Fundraising teams, enterprise sales, light M&A | $3,500 one-time + $500/mo hosting | ~92% | Canonical index page, watermarking, access logging, provenance chips | Deal-Room (INV-01), Disclosure Pack (DP-01) |
| **GRC-03** | Vendor Intake & DPIA Helper | SaaS companies in regulated industries | $5,000 setup + $2,000/mo (includes 3 DPIAs) | ~80% | Intake-to-risk calculator workflow producing DPIA draft with data flows and mitigations | Privacy Gateway (PRIV-01), Policy Bundle (POL-01) |
| **AIE-01** | LLM Evaluation Harness with Receipts | Product teams and agencies launching LLM features | $4,000 setup + $1,500/mo; $0.10/test over 20k | ~85% | Test set runner, rubric scoring, deltas, cost & latency histograms, claim ledger | AI Audit Trail (AIG-01), Redaction Proxy (AIG-01) |
| **VRM-02** | Security Questionnaire Library & Portal | B2B SaaS companies with enterprise pipeline | $6,000 setup + $2,000/mo; $150/form after 15 per month | ~88% | Answer bank plus automations for top 10 buyer portals with inline provenance | SOC2-lite (GRC-01), SBOM/SLSA (SEC-02) |
| **SALES-03** | Sales Asset Watermarker & Claim Chips | Founder- or SE-led sales motions | $1,500 setup + $400/mo | ~95% | Automated watermarking and IntelGraph-linked claim chips on sales assets | RFP Answering (SALES-02), Customer Value Memo (CVM-01) |
| **WL-01** | Partner SI White-Label Kit | Boutique SIs and compliance shops | $0 setup + 30% revenue share **or** $8,000 license + 10% rev-share | ~90% | Co-branded DP-01, SEC-02, and VRM-01 runbooks with pricing guardrails and revenue-share terms | Certification bundles, territory exclusives |
| **OPS-03** | Backlog-to-Decision Groomer | Product & operations teams needing accountable decisions | $2,000 setup + $800/mo | ~93% | Weekly ritual orchestration, Decision nodes with owners/DoD, automated reminders | Exec Dispatch (DEC-01), Portfolio Review (OPS-01) |
| **ID-01** | Access Review & Step-Up Auth Starter | Teams pursuing SOC2/ISO-lite readiness | $3,000 setup + $1,000/mo | ~85% | Role/resource snapshot, attested quarterly reviews, WebAuthn step-up for privileged actions | Policy Bundle (POL-01), Privacy Gateway (PRIV-01) |
| **MKT-01** | Content Provenance for Marketing | Marketing teams in regulated or enterprise sales motions | $2,500 setup + $750/mo | ~92% | Content pipeline with citation chips, signed exports, compliance-ready audit trail | Sales Asset Watermarker (SALES-03), Deal-Room (INV-01) |
| **REF-01** | Customer Reference & Proof Hub | B2B SaaS teams needing trustable proofs | $2,000 setup + $600/mo | ~93% | Gallery of accepted artifacts (packs, SBOMs, DPIAs) with shareable tokens | Metrics Pack (OPS-01), Investor Auto-Pack (INV-01) |

## Bundled Offers

| Bundle | Composition | Pricing | Ideal Motion | Notes |
| ------ | ----------- | ------- | ------------ | ----- |
| **GOV-S** (Governance Starter) | DP-01 + SEC-02 + DEC-01 | $5,000 setup + $3,500/mo (20% off à la carte) | Land-and-expand governance and compliance | Stack with POL-01 or GRC-03 for deeper controls |
| **ENT-R** (Enterprise Ready) | GRC-01 + POL-01 + VRM-02 | $12,000 setup + $5,000/mo | Enterprise readiness proof for scaling SaaS | Ideal follow-on to OPS-01 + DRM-01 |
| **FR-F** (Fundraise Fast) | INV-01 + DRM-01 + OPS-01 | $8,000 one-time + $1,500/mo until close | Fundraising diligence blitz | Pair with REF-01 for proof gallery |
| **LLM-SAFE** (LLM Safeguard) | AIG-01 + AIE-01 + PRIV-01 | $7,000 setup + $3,000/mo | LLM productization and risk mitigation | Add POL-01 for policy hardening |

## Two-Week “First Slice” Patterns

- **GitHub-first**: Install SEC-02, generate SBOM, sign release, deliver DP-01 pack for investor/security acceptance.
- **Sales-first**: Import most recent RFP, auto-draft via SALES-02, have reviewer approve 80% answers, book next call.
- **Privacy-first**: Deploy PRIV-01 on intake form, collect redaction logs, generate DPIA draft via GRC-03, share with legal.
- **LLM-first**: Pair AIG-01 proxy with AIE-01 evaluation harness, establish baseline metrics, reduce inference cost, decide to ship or sunset feature.

## Pricing Guardrails (Reiterated)

- Maintain ≥70% gross margin on every engagement.
- Position pilots at $10–25k fixed fee; introduce change orders after 12 hours of variance.
- Default to GitHub-only integration footprint in week one unless expansion is explicitly paid.
- Documentation guarantees process fidelity, not customer data of record.

Use this sheet alongside the SOW templates to accelerate quote-to-close cycles while preserving margin discipline.
