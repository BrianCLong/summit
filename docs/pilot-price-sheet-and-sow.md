# Summit Governance Launch Pack

## Price Sheet (Release Candidate)

| SKU      | Name                             | Pilot Pricing (Setup + Monthly)                 | Included Volume                             | Overage                   | Key Deliverables                                                                                        | Target ICP                                        | Attach/Upsell Paths |
| -------- | -------------------------------- | ----------------------------------------------- | ------------------------------------------- | ------------------------- | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------- | ------------------- |
| DP-01    | Disclosure Pack Generator        | $5k setup + $2k/mo                              | 10 packs/mo                                 | $100/pack                 | Automated provenance pack (claims, sources, SBOM, SLSA attestation, rollback plan) accepted by reviewer | Seed–Series B AI/SaaS; boutique SI/security firms | GRC-01, INV-01      |
| INV-01   | Deal-Room Auto-Pack              | $4k setup + $500/mo during raise                | 1 fundraise in flight                       | $500 per additional raise | Investor diligence folder with metrics, risk memo, rollback policy, provenance links                    | Seed–Series A founders; accelerators              | OPS-01, DEC-01      |
| GRC-01   | SOC2-lite Starter                | $7.5k setup + $2.5k/mo (3-mo min)               | Control framework + 3 Maestro evidence runs | $400/run                  | Policy bundle, ABAC starter, WebAuthn checklist, evidence automation                                    | <50-person SaaS selling upmarket                  | SEC-02, GRC-02      |
| SEC-02   | SBOM/SLSA for GitHub             | $1.5k setup + $1k/mo/repo (Enterprise: $15k/yr) | 1 repo                                      | $400 per extra repo       | Release-time SBOM build, signed artifacts, provenance on GitHub Releases                                | Dev-led SaaS; OSS vendors                         | DP-01, VRM-01       |
| AIG-01   | AI Audit Trail & Redaction Proxy | $3k setup + min $1.5k/mo ($0.50/1k req)         | 3M proxied requests                         | $0.50/1k beyond allotment | Drop-in proxy with prompt/response logging, redaction, policy tags                                      | LLM feature teams; agencies                       | DEC-01, SALES-02    |
| DEC-01   | Decision Log & Exec Dispatch     | $1k setup + $750/mo (≤25 users)                 | Unlimited decisions                         | $25/user beyond 25        | Slack/GitHub capture into IntelGraph decisions + daily CEO brief                                        | Founder-led teams; security-sensitive ops         | OPS-01, GRC-02      |
| VRM-01   | Vendor Security Autofill         | $3k setup + $200/form (10 included)             | 10 questionnaires                           | $200/form beyond 10       | Auto-filled CAIQ/custom questionnaires with citations                                                   | B2B SaaS in late-stage security reviews           | GRC-01, SEC-02      |
| SALES-02 | RFP Answering w/ Provenance      | $6k setup + $3k/mo (6 RFPs)                     | 6 RFPs/mo                                   | $500/RFP beyond 6         | Templated answer bank with claim refs, exports to Word/Portals                                          | Mid-market/enterprise sales teams, SIs            | INV-01, VRM-01      |
| OPS-02   | Meeting-to-Decision Pipeline     | $2k setup + $1k/mo                              | Unlimited meetings within scope             | $250 per additional team  | Calendar/Meet/Zoom capture → decision/action pipeline                                                   | Ops-heavy startups, agencies                      | DEC-01, OPS-01      |
| PRIV-01  | Privacy Gateway for Forms & APIs | $2.5k setup + $1.5k/mo                          | 5M events/mo                                | $0.35/1k beyond allotment | Gateway that classifies/redacts PII with policy labels                                                  | Healthcare/fintech SaaS; agencies                 | GRC-03, AIG-01      |

### Packaging & Margin Guardrails

- Paid pilots: 2–4 weeks, $10k–$25k all-in with setup, automation, success criteria.
- Maintain ≥70% gross margin; re-scope or reprice if services exceed 30% effort beyond week 4.
- Bundle 3+ SKUs as a **Governance Pack** for a 20% discount to land and expand.

### Offer Hooks & Channel Levers

- **Guarantee:** “We get your next investor/security reviewer to yes in 14 days or we work free until we do.”
- **Channels:** Founder-led outbound, security/DevRel communities, accelerator partners, boutique SIs (20% rev-share).
- **Design Partner Terms:** 8-week base term, 2x renewal option, co-marketing optional, list less 30% for reference rights.

## 2-Week Pilot SOW (Template)

**Customer:** ****\*\*****\_\_****\*\***** **Start Date:** \***\*\_\_\*\*** **Pilot Fee:** $\***\*\_\_\_\_\*\***

**Scope Overview:** Deliver DP-01 + SEC-02 (core) with optional add-ons marked below.

- [ ] DP-01 Disclosure Pack Generator (baseline)
- [ ] SEC-02 SBOM/SLSA for GitHub (baseline)
- [ ] ****\*\*\*\*****\_\_\_\_****\*\*\*\***** (optional)

### Objectives & Success Criteria

1. Produce at least one Disclosure Pack accepted by an investor/security reviewer.
2. Automate SBOM + SLSA artifact generation attached to customer GitHub Releases.
3. Capture ≥3 critical decisions in IntelGraph with linked Maestro run IDs and rollback plan.
4. Signed conversion to subscription or prepaid pack by Day 14.

### Deliverables

- **Artifacts:** Disclosure Pack v1, SBOM + provenance bundle, Decision Log entries, rollback plan.
- **Automation:** GitHub App + CLI configured in customer repo(s), Maestro evidence runs scheduled.
- **Documentation:** Runbook for pack regeneration, reviewer checklist, remediation tracker template.
- **Handoff:** Live demo + stakeholder walkthrough; 1 revision within scope if reviewer requests.

### Timeline & Workstreams

| Day Range  | Activities                                                                             | Owner                 | Customer Inputs                                        |
| ---------- | -------------------------------------------------------------------------------------- | --------------------- | ------------------------------------------------------ |
| Days 1–2   | Kickoff, access provisioning, repo/log integration, finalize SKU selection             | A (Eng), H (Pilot PM) | Stakeholder map, repo access, decision log workspace   |
| Days 3–5   | Instrument pipelines, run initial SBOM build, seed decision log, draft policy defaults | A, D, E, F            | Provide existing policies, validate redaction defaults |
| Days 6–8   | Generate Disclosure Pack draft, run reviewer dry run, enable automation schedules      | A, F, I               | Feedback on claims/sources, reviewer availability      |
| Days 9–11  | Stakeholder demo, collect revisions, lock rollback plan, prep conversion offer         | A, H, B               | Confirm reviewer acceptance, share diligence blockers  |
| Days 12–14 | Final pack delivery, acceptance sign-off, subscription conversion or prepay            | A, H, B, J            | Execute order form, confirm next pack cadence          |

### Assumptions & Dependencies

- GitHub is the initial integration target; other SCMs incur change order.
- Customer provides decision owners and reviewer contacts within 48 hours of kickoff.
- Additional services beyond 12 variance hours trigger a mutually agreed change order.
- Compliance statements attest to process fidelity, not the truthfulness of customer data.

### Commercial Terms

- Pilot fee invoiced 50% at signature, 50% at Day 7.
- Travel/expenses (if any) billed at cost with prior approval.
- Post-pilot subscription auto-activates unless cancelled in writing before Day 14 deliverable sign-off.

**Signatures**

Customer Representative: ****\*\*\*\*****\_\_\_\_****\*\*\*\***** Date: \***\*\_\_\*\***

Summit Representative: ******\*\*******\_******\*\******* Date: \***\*\_\_\*\***
