# Internal Adoption, Dogfooding & Change Management

## Mission and Principles

- Make CompanyOS the default operating layer for our internal operations and experimentation.
- Dogfood every new surface with internal tenants before external GA to improve quality, UX, and operational maturity.
- Close the loop quickly with measurable feedback, so internal experience directly sharpens the product.

## Internal Tenants & Use Cases

- **Corporate Ops (Internal "Company" Tenant)**
  - Scope: HR, finance, IT, compliance, procurement, workplace, and company-wide OKRs.
  - Goals: Run core business processes end-to-end on CompanyOS; establish exemplars for workflows, access policies, and reporting.
- **Engineering Quality & Release Tenant (Dogfood Core)**
  - Scope: Build pipelines, incident/runbook automation, experiment flags, service catalog, SRE rituals.
  - Goals: Stress-test developer/SRE flows; ensure auditability, rollback, and recovery patterns are first-class.
- **Sales, CS & Support Tenant (Go-to-Market)**
  - Scope: Accounts, renewals, support queues, success plans, playbooks, and product enablement assets.
  - Goals: Validate CRM-style features, collaboration surfaces, and integration stability with external tools.
- **Training & Enablement Tenant**
  - Scope: Sandbox environments for onboarding, certifications, and partner training.
  - Goals: Safe demos, guided walkthroughs, and reusable curricula built on real features.
- **Experimental/QA Tenant**
  - Scope: Chaos tests, load/perf baselines, synthetic data, and pre-release toggles.
  - Goals: Reproduce edge cases rapidly, validate migrations, and practice staged rollouts.

### Feature Adoption Lead Teams

- **Platform Engineering**: first adopters for infra, authz, multi-tenant, observability, deployment orchestration.
- **Security & GRC**: first adopters for policy as code, access reviews, data residency, audit logs.
- **Sales Ops & CS**: first adopters for workflow automation, playbook design, and in-app guidance.
- **People Ops**: first adopters for approvals, onboarding/offboarding, and document workflows.
- **Support**: first adopters for ticketing, alerts, and knowledge base authoring.

## Dogfooding Programs

### Internal GA vs External GA Criteria

- **Internal GA entry**: feature flagged on in experimental tenant; functional parity with spec; baseline monitors + dashboards; rollback plan defined; data model versioned; initial docs and runbooks published.
- **Internal GA exit / readiness for external GA**: stability SLOs met for ≥2 sprints; ≥3 internal teams actively using; Sev1/Sev2 bug rates trending down; usability survey ≥80% satisfaction; telemetry coverage mapped to success metrics; security/privacy review passed.

### Feedback Collection Loops

- **Issues**: templated bug/feedback forms in CompanyOS; auto-triage to owning squad; SLA targets (24h triage, 72h action plan).
- **Suggestions**: monthly product council with rotating internal teams; roadmap voting inside app; lightweight RFCs for larger changes.
- **Embedded telemetry**: task completion funnels, time-to-first-value, error budgets, feature-flag exposure, satisfaction micro-surveys; dashboards visible to all internal adopters.
- **Live sessions**: weekly dogfood hour (hands-on), monthly enablement clinics for new features.

### Reward & Recognition Patterns

- "Dogfood Champion" badges for teams hitting adoption milestones (usage + actionable feedback quality).
- Quarterly spotlight for the best internal improvement suggestion shipped.
- Priority roadmap consideration and swag budget for teams piloting risky features first.

## Change Management & Communication

- **Announcements**: bi-weekly release notes (email + in-app digest), in-app banners for tenant-specific changes, Slack #companyos-updates channel for heads-up on flags and migrations.
- **Briefings**: 15-minute release huddles with affected teams for major changes; office hours during rollout windows.
- **Playbooks for major behavior changes**:
  - Feature flags default-off → staged cohorts → org-wide enable.
  - Shadow/dual-run when changing critical workflows; capture diffs in logs.
  - Support prep: updated runbooks, FAQ snippets, response macros, escalation paths.
  - DR/rollback drills prior to enabling in the corporate tenant.
- **Metrics** (per feature and per tenant): active users, task completion rate, time-to-value, bounce/abandonment, incidents, SLA attainment, NPS/CSAT micro-surveys, and feedback-to-fix cycle time.

## Artifacts

### Internal Adoption & Dogfooding v0 Outline

1. Objectives & success criteria.
2. Tenant map (owners, data domains, risk level, flag strategy).
3. Feature intake checklist (internal GA entry requirements).
4. Rollout stages and timelines per tenant.
5. Feedback & telemetry plan (dashboards, owners, cadences).
6. Support & enablement plan (docs, training, office hours).
7. Risk/rollback matrix and decision thresholds.
8. Exit criteria for external GA.

### Example Rollout Plan (Major New Feature)

- **Feature**: Unified Approvals Workflow.
- **Prep (Week 0)**: enable in Experimental/QA tenant with synthetic data; publish runbook; set alerting on latency/error budgets; create migration rollback script.
- **Pilot (Week 1)**: enable for Platform Eng + People Ops in Engineering Quality tenant; run shadow mode vs existing approvals; daily standup checkpoint.
- **Expand (Week 2)**: enable for Sales Ops & Support in Go-to-Market tenant; collect usability surveys after 3 days; fix Sev1/Sev2 within 24h.
- **Harden (Week 3)**: enable in Corporate tenant for a single department; monitor completion rates and policy violations; run DR drill.
- **Internal GA (Week 4)**: org-wide enablement; publish case study + how-to video; open feedback RFC window for 1 week.
- **External GA readiness**: confirm metrics vs targets, close Sev1/Sev2, finalize docs and support macros.

### Checklist: Feature is Ready for External GA If…

- Stability: ≥99.5% success rate over two sprints; no open Sev1/Sev2.
- Adoption: ≥3 internal teams using in production tenant; positive trend in task completion/time-to-value; NPS/CSAT ≥80%.
- Observability: dashboards for latency, errors, and usage; alerting with paging rules; feature flag + rollback path validated.
- Security/Compliance: threat model complete; permissions reviewed; data retention & residency documented; privacy review passed.
- Support/Docs: runbooks, FAQs, and quick-start guides published; enablement materials delivered; known limitations listed.
- Operations: migration/rollback tested; on-call ownership assigned; capacity/load tests meet targets; integration contracts versioned.
- Feedback loop: issue templates live; feedback triage SLAs defined; telemetry mapped to north-star success metrics.
