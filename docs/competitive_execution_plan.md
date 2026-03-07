# Competitive Execution Plan

This plan operationalizes competitive intelligence, switching-cost strategy, land-and-expand growth, pricing discipline, reliability, security, narrative operations, partner distribution, and legal readiness into a single program with accountable owners, cadences, and measurable outcomes.

## Guiding Principles

- Evidence over conjecture: every claim must map to a source and verification path.
- Safety first: no defamation, no scraping of restricted assets, and legal review on competitive language.
- Product-led moats: reduce switching friction by making our product objectively better and faster to deploy.
- Instrument everything: telemetry, audits, and review rituals are required for every stream.

## Program Governance

- **Executive sponsor:** VP Product
- **Program lead:** Head of Competitive Strategy
- **Working group:** Product, Sales, Marketing, Security, Legal, Support, RevOps, and Data.
- **Operating rhythm:**
  - Weekly: win/loss review, release cadence check, top risk refresh.
  - Monthly: competitive council with decision logs and action assignments.
  - Quarterly: pricing experiments and legal-risk review.
- **Systems of record:**
  - Competitive data: claim library + teardown repo (version-controlled).
  - Deal intel: CRM win/loss pipeline with required fields and tags.
  - Reliability/security: status page + monthly reliability/security releases.

## Epic 1 — Competitive Intelligence (Legally Clean)

- **Competitor matrix:** Standardized template covering features, pricing, packaging, segments, claims, proof points, and verification status. Owners update weekly; PR review required for changes.
- **Win/loss pipeline:** Mandatory CRM fields (competitor, segment, use case, objection, reason codes), tags for claims cited, and weekly review with Sales + Product.
- **Customer verbatims:** Structured intake via form/API to data warehouse; anonymize where required; block hearsay uploads.
- **Claim library:** Source links, evidence ratings, last-verified dates, and legal status. Redlines rejected for speculation.
- **Release cadence tracker:** Calendar of competitor launches mapped to our roadmap deltas; alerts for gaps >30 days.
- **Competitive risk register:** Top 10 threats with mitigations, owners, and due dates; refreshed weekly.
- **Battlecards:** Approved language only, tagged with evidence IDs; auto-expire after 60 days without review.
- **Teardown repo:** Versioned screenshots, flows, latency notes, integrations; hashed assets; provenance metadata.
- **Switch-cost inventory:** Data, workflows, users, integrations, approvals; map to importer/compat coverage.
- **Competitive council:** Monthly decision log, action register, and escalations to product backlog.
- **Competitive responses:** Ship at least one response per month with measured win-rate impact.

## Epic 2 — Switching Costs (Product-First)

- **Importers:** Top three competitor importers (data + configs + history when available) with validation + parity diff reports.
- **Compat mode:** Terminology/mapping layers per competitor; reversible toggles per workspace.
- **Bulk tools:** Bulk edit/export/permissions/workflows with audit trails and rate limiting.
- **Migration validation:** Diffs, parity checks, “what did not migrate” reports with remediation links.
- **Reversible actions:** Undo/rollback for high-stakes operations with guardrails.
- **Audit trails:** Durable, signed logs for regulated workflows; customer-owned retention policies.
- **Deep saved views/automations:** Opinionated templates that are hard to recreate elsewhere.
- **Integration drop-in replacements:** Webhooks/ETL/SSO adapters with idempotency, retries, and signatures.
- **Collaboration gravity:** Roles, approvals, comments, and notifications that create habit loops.
- **Enterprise controls:** Customer-managed keys and governance policies where required.
- **Metrics:** Measure time-to-migrate and retention lift per cohort; publish monthly.

## Epic 3 — Land and Expand

- **Smallest viable footprint:** One-week “first value” package with starter template producing an executive artifact (report/export/dashboard).
- **Workspaces:** Per-team spaces with clean boundaries, easy upgrades, and SCIM-ready seat expansion.
- **Invite loops:** Role-aware invitations with collaboration ready-to-use; objection handling built into flows.
- **Champion kit:** ROI dashboard + shareable proof artifacts; usage nudges for adjacent teams.
- **Seat expansion hooks:** Role templates, group assignment, SCIM readiness, departmental billing/chargeback.
- **Admin console:** Rollout tooling easier than alternatives with guardrails.
- **Playbook:** Expansion triggers → actions → messaging; track seats/modules/workflows per cohort.

## Epic 4 — Pricing as Strategy

- **Market map:** Pricing/packaging map (tiers, limits, add-ons) with competitive bundles that simplify purchasing.
- **Value metrics:** Define, meter, and audit value metrics; instrument leakage (over-grants/under-billing) with auto-remediation.
- **Entitlements:** Single entitlement system; no hardcoded plan logic; guardrails for discount approvals and expirations.
- **Migration offers:** Time-boxed, controlled incentives; renewal tooling with uplift targets and concession tracking.
- **Transparency:** Usage dashboards customers trust; upgrade moments tied to real benefits.
- **Experiments:** Quarterly packaging experiments with holdouts and churn guardrails.

## Epic 5 — Reliability & Performance

- **SLOs:** Define and publish SLOs for three critical journeys; tie error-budget spend to roadmap pacing.
- **Synthetics:** End-to-end synthetic checks (including third-party dependencies) with progressive delivery + auto-rollback on SLO burn.
- **Error remediation:** Fix top 20 customer-visible errors; self-heal tooling for retry/resync/reconnect with safeguards.
- **Latency:** Reduce p95 on top 10 demo-critical endpoints; monthly reliability report as sales asset.
- **Status page:** Incident history, stable update cadence, and incident comms templates.

## Epic 6 — Trust, Security, and Procurement Velocity

- **Access:** Centralize privileged access behind SSO/MFA; least-privilege IAM with quarterly reviews and auto-expiry.
- **Audit & secrets:** Immutable admin-action logs; enforced secrets management and rotation with verification.
- **Data protection:** PII redaction at ingestion for logs/analytics; SBOM + license scanning gates in CI.
- **Evidence packs:** Controls, policies, diagrams, uptime history, FAQs; Trust Center kept current.
- **Enterprise features:** SSO, SCIM, session controls, role templates; tabletop exercises documented.
- **Questionnaires:** Standard answers + automation to cut response time by 50%.

## Epic 7 — Narrative Ops

- **Messaging:** Approved pillars (speed, trust, ROI, governance, ecosystem) with a claim ladder tied to evidence.
- **Talk tracks:** Competitor-safe scripts; “Reliability/Security Releases” published like product launches.
- **Product comms:** In-product “what’s new” tied to outcomes; cancellation reason codes fed back to roadmap.
- **Proof:** Benchmarks, case studies, before/after metrics; demo scripts under 5 minutes highlighting differentiators.
- **Measurement:** Track win rate, sales-cycle time, and churn reasons; surface in the council.

## Epic 8 — Distribution via Partners

- **Partner program:** Identify 10 high-leverage partners with tiering, benefits, and obligations.
- **Integration standards:** Webhooks, retries, signatures, idempotency, versioning; adapter framework for new partners.
- **Certification:** Partner sandbox with automated pass/fail tests; governance with allowlists, scopes, quotas, kill switches.
- **Go-to-market:** Co-marketing kit (webinars, landing pages, demo assets) and deal registration rules.
- **Analytics:** Installs, retention, errors, revenue influence; quarterly business reviews with pipeline quality.
- **Deprecation:** Migrate bespoke partner hacks into standardized connectors.

## Epic 9 — Lawfare, But Legit

- **IP & OSS:** IP ownership audit; OSS compliance with attribution and license policy enforced in CI.
- **Trademarks & contracts:** Brand hygiene plan and standardized customer terms to reduce legal debt.
- **Defamation-safe policy:** Rules for public statements; process for responding to competitor FUD with facts and proof.
- **Portability playbook:** Safe customer data portability; incident notification protocol aligned to contracts.
- **Vendors:** Subprocessor register with SCC/DPA readiness; enforcement ladder for misuse/abuse.
- **Legal review:** Quarterly legal-risk review with top exposures, shipped mitigations, and expired exceptions.

## Execution Controls

- **Owner mapping:** Each deliverable has an accountable owner, due date, and success metric tracked in the PM system.
- **Reviews:** Monthly council decisions captured as ADRs; battlecards and claim library require legal + product review before publication.
- **Metrics dashboard:** Win rate, time-to-migrate, retention lift, p95 latency, SLO burn-down, discount leakage, questionnaire cycle time, partner retention, and churn reasons.
- **Compliance:** All assets version-controlled with provenance; no speculative claims; all evidence tagged with source and verification date.

## Forward-Looking Enhancements

- **State-of-the-art:** Add LLM-assisted evidence classification (source credibility scoring) with human-in-the-loop approval; guarded by PII redaction and rate limits.
- **Automation:** Auto-generate differential battlecards when competitor release cadence shifts; trigger proactive responses tied to roadmap deltas.
- **Observability:** Correlate competitive wins/losses with reliability/security SLO trends to prioritize investments.
