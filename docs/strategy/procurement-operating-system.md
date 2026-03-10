# Strategic Procurement Operating System

This playbook operationalizes procurement, vendor risk, and contract governance across the nine epics provided. It is designed for a single intake front door, risk-tiered approvals, rigorous VRM, standardized contracts, and ongoing spend discipline.

## Operating Model (People, Process, Tech)

- **Front door:** Self-serve intake form capturing owner, use case, ROI, spend, data classification, and data-risk exposure; auto-routes by spend/risk tier.
- **RACI:**
  - **Requestor:** submits intake, provides business case/ROI, confirms seat hygiene.
  - **Security:** runs VRM tiering, approves data handling & SSO/MFA posture, maintains subprocessor register.
  - **Legal:** owns MSA/DPA, clause library, concessions register, signature authority matrix.
  - **Finance/Procurement:** budget check, thresholds, PO issuance, chargeback/showback, “no PO/no pay” enforcement.
  - **IT/Identity:** SSO setup, least-privilege groups, integration effort sizing, access lifecycle.
- **Systems:** Procurement portal (intake + workflow), CLM for contracts/metadata, VRM tooling, CMDB/vendor catalog, BI for spend and KPIs, ticketing for remediation.

## Tiering & Approval Thresholds

- **Risk tiers (VRM):**
  - **Tier 0 (critical/customer-impacting):** production-facing or PII/PHI; requires deep assessment, exec approval, security sign-off, and exit plan.
  - **Tier 1 (high-risk):** handles sensitive data or core ops; standard assessment, legal review, finance approval, SSO/MFA required.
  - **Tier 2 (medium):** business data, limited integrations; lite assessment, standard terms, manager+procurement approval.
  - **Tier 3 (low):** no sensitive data, low spend; templated contract, auto-approval within budget guardrails.
- **Spend gates:** Define thresholds per region/currency with matrixed approvers (manager → director → VP/CFO). Auto-block if ROI < hurdle or budget not allocated.
- **Exceptions:** Logged with expiry dates, rationale, compensating controls; reviewed monthly.

## Intake & Workflow

1. **Intake form (required fields):** owner, use case, problem statement, ROI model, spend estimate (CAPEX/OPEX), term, data categories, data flows, integration needs, renewal/notice dates, seats requested, preferred vendor list check.
2. **Auto-routing:** workflow engine assigns to Security/Legal/Finance based on spend + data-risk tier; SLA timers start.
3. **Evidence attachments:** SOC 2/ISO, pen test, subprocessor list, DPIA if applicable; required before VRM sign-off.
4. **Trial handling:** time-boxed trials with auto-expiry, usage checks, and auto-revoke unless upgraded via intake.

## Vendor Risk Management (VRM)

- **Assessments:** lite/standard/deep with evidence requirements; map to data access, criticality, and integration scope.
- **Security bar:** SSO/MFA, incident notification (<24–72h tiered), retention limits, data deletion SLAs, subprocessor disclosure, audit rights.
- **Remediation tracking:** Jira/ServiceNow queue with due dates, escalation path, and closure evidence; block go-live if red.
- **Reassessments:** annual for Tier 0/1 or after material change/security incident; maintain subprocessor change log.
- **Exit plans:** data export, deletion attestations, fallback vendors, continuity runbooks.

## Contract Standardization

- **Templates:** Standard MSA/DPA with AI vendor addendum (“no training on our data”), LoL/indemnity fallbacks, termination-for-security clause, price-uplift caps, auto-renew notice triggers, most-favored only when strategic.
- **Clause library:** negotiated positions with playbook guidance and risk rating; link to concessions register that expires on renewal.
- **Signature controls:** authority matrix; block “click-to-accept” for high-risk tools.

## Spend Management & Seat Hygiene

- **Spend mapping:** category/owner/vendor with monthly publication; budget alerts and anomaly detection for spikes.
- **Seat controls:** utilization telemetry per SaaS; reclaim inactive seats monthly with manager confirmation; default lowest tier, upgrades require justification.
- **Chargeback/showback:** allocate discretionary spend to teams; track vendor spend/employee and target reduction.
- **Renewals:** calendar with notice windows and negotiation playbook; enforce “no PO/no pay”.

## Tool Rationalization & Deletion

- **Catalog:** owners, Tier, data risk, “keep/kill” status.
- **Overlap policy:** new tool requires decommissioning plan for overlapping category; migration scripts and SSO/integration teardown tracked.
- **Quarterly purge:** publish deleted tools, savings, toil reduction; prevent re-buy of retired tools.

## Performance & SLA Management

- **Tiered SLAs:** availability/latency/error budgets per Tier 0/1/2; vendor incident escalation paths and templates.
- **Monitoring:** uptime/latency where vendor impacts customers; require postmortems for Tier 0 incidents.
- **Roadmap watch:** track deprecations/major changes; vendor change review process for security/operational impact.

## Data Handling & Privacy Controls

- **Data sharing rules:** allowed data by category (support/analytics/marketing), minimization and field allowlists for integrations.
- **Controls:** logging for exports/shares, DLP blocks for restricted data, retention/deletion terms, cross-border posture tracking.
- **Customer consent:** workflows where required; maintain subprocessor register; require deletion attestations on termination.

## Onboarding Automation

- **Portal:** guided flows, ready-to-buy checklist, and negotiation support scripts for budget owners.
- **Routing:** auto-assign tasks to Security/Legal/Finance; SLA timers and cycle-time reporting.
- **SSO/IT:** auto-provision scoped groups and API keys with least privilege; trial expiry automation.

## Governance & Metrics

- **Vendor Council:** Finance + Legal + Security + IT; decision SLAs, monthly vendor memo (additions, deletions, renewals, risks, actions).
- **KPIs:** cycle time, savings shipped, seat utilization, vendor incidents, exceptions aging, procurement policy compliance, vendor spend/employee.
- **Top risks/opportunities:** maintain top-10 risk log and top-10 savings opportunities with owners and ship dates.
- **Audits:** shadow spend detection (expense/SSO logs) and exceptions registry expirations.

## Execution Roadmap

- **0–30 days:** stand up intake form, tiering matrix, approval thresholds, exceptions registry, renewal calendar import, preferred vendor list, “no PO/no pay” policy comms.
- **31–60 days:** launch VRM workflows, clause library in CLM, seat utilization telemetry for top SaaS, trial auto-expiry, initial vendor catalog with tiers and risk data.
- **61–90 days:** enforce onboarding automation with routing SLAs, run first rationalization review and delete ≥1 vendor, integrate vendor incidents into IM process, launch vendor scorecards.
- **Quarterly cadence:** vendor rationalization purge day, SLA review for Tier 0/1, vendor program retro, publish savings + risk reductions.

## Controls & Checklists

- **Intake gate:** required fields + ROI hurdle + preferred vendor check.
- **VRM gate:** assessment completed, remediation closed or tracked with due dates, subprocessor list loaded, exit plan defined for Tier 0/1.
- **Contract gate:** standard templates or approved deviations logged with expiry; auto-renew notice tracking enabled.
- **Finance gate:** budget confirmed, PO issued, “no PO/no pay” flag set, chargeback owner assigned.
- **IT/Access gate:** SSO configured, least-privilege groups, audit logging enabled, seats right-sized.
- **Renewal gate:** scorecard reviewed (spend, usage, reliability, risk, business value), negotiation strategy set, deletion candidate assessed.

## Artifacts to Maintain (living)

- Procurement intake template + workflow SLA dashboard.
- Risk tiering matrix and assessment questionnaires (lite/standard/deep).
- Preferred vendor list with blocked/shadow vendors and rationale.
- Renewal calendar with notice/negotiation windows and owners.
- Concessions register with expiry; exceptions registry with compensating controls.
- Vendor catalog + scorecards (spend, usage, reliability, risk, business value).
- Exit plans for Tier 0/1 vendors; integration data-flow register with DLP controls.

## Accelerators / Forward-Looking Enhancements

- **AI copilot for procurement:** auto-draft MSAs/DPAs from clause library, highlight risky deviations, and suggest negotiation levers based on scorecards.
- **Anomaly detection:** ML on spend/utilization to flag shadow tools and renewal uplift risk.
- **Policy as code:** encode gates (intake completeness, VRM status, SSO enforced) in workflow engine/OPA for consistent enforcement.
- **Vendor reliability probes:** synthetic monitors for critical vendors feeding SLA dashboards and renewal negotiations.
- **Automated teardown:** scripted deprovisioning of access, integrations, and data exports when tools are retired or trials expire.
