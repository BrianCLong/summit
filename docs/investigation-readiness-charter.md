# Investigation Readiness Charter

## Purpose

This charter operationalizes government request handling, legal holds, evidence collection, and communications into a single, governed program. It converts the nine epics below into actionable controls, SLAs, and playbooks so the organization can respond to subpoenas, warrants, cross-border demands, and internal investigations with speed, fidelity, and auditability.

## Epic 1 — Investigation Readiness Charter (program definition)

- **Scope Definition:** Enumerate what constitutes a government matter (subpoena, CID, warrant, emergency request, informal inquiry) and explicitly exclude normal support/commercial asks.
- **Decision Authority:** Document Legal lead + Security lead + Exec sponsor thresholds for approvals, with alternates and quorum rules.
- **Severity Rubric:** Score matters on legal risk × operational impact × PR risk with pre-baked responses and escalation thresholds.
- **Single Intake Channel:** Route all inbound requests through a controlled channel; prohibit direct individual responses.
- **Matter ID & Evidence Log:** Assign unique matter IDs with timeline, approvals, and evidence inventories; enforce privilege labeling and work-product hygiene.
- **Response SLAs:** Maintain a matrix of service deadlines and escalation triggers tied to severity.
- **Comms Rules:** Pre-approve staff/customer/partner communications; maintain exceptions registry with expiry and justification.
- **Tabletop Drills:** Run quarterly scenarios (subpoena + press leak + system outage) and scrub ad-hoc replies that bypass Legal.

## Epic 2 — Intake & Triage Factory

- **Standard Intake Form:** Capture agency, authority, scope, deadline, service method, and verification artifacts.
- **Validity & Jurisdiction Checks:** Detect service defects, overbroad scope, and authority gaps; log decisions.
- **Response Pathing:** Identify legal basis and options (comply, narrow, object, move to quash) with counsel notes.
- **Data Classification:** Identify PII/PHI/PCI/biometrics and any heightened rules; determine notice allowances or prohibitions.
- **Cross-Border Conflicts:** Check residency, blocking statutes, and transfer constraints early.
- **Ownership:** Assign custodians and technical data owners with accountability; open a workspace with tasks, timeline, and approvals.
- **Preservation & Deadlines:** Trigger targeted holds, start deadline tracker with reminders/escalations, and publish a one-page triage memo within 24 hours for serious matters.

## Epic 3 — Legal Hold & Preservation

- **Trigger Definitions:** Differentiate triggers for subpoenas, warrants, and civil demands.
- **Targeted Holds:** Issue scoped holds (custodians + systems + date ranges) with automated notices and acknowledgments.
- **Controlled Retention:** Freeze deletion policies only where required; include ephemeral sources (chat, logs, tickets, CI/CD, cloud audit trails) and state snapshots (configs, access lists).
- **Chain of Custody:** Log every collected artifact with hashes and custody entries; track hold release and verify deletion resumes.
- **Compliance Audits:** Quarterly audits for acknowledgments, gaps, and missed systems; train managers to avoid uncontrolled copies.

## Epic 4 — eDiscovery & Collection Pipeline

- **Data Source Map:** Maintain authoritative inventory across SaaS, DBs, object stores, logs, email, and chat with approved collection methods per source.
- **Collection Toolkit:** Provide hashing, manifests, and access controls; enforce dedupe and scoping to avoid overcollection.
- **Redaction Workflow:** Policy-backed redaction for sensitive/irrelevant data; stage privilege/relevance review with quality checks.
- **Production Standards:** Standardize load-file/index/manifest formats with production metadata and audit logs; run quarterly mock productions.
- **Cost Controls:** Apply batch strategy, prioritization, and early case assessment; ban ad-hoc exports from engineer machines—gateway tooling only.

## Epic 5 — Law Enforcement Request Handling

- **Playbooks by Type:** Subpoena, 2703(d), warrant, emergency/exigent, MLAT, with verification steps for agency identity, legal authority, and scope.
- **Least-Data Principle:** Produce only what is compelled; document notice decisions and gag-order tracking.
- **Secure Delivery:** Encrypted, logged delivery paths; maintain transparency reporting inputs.
- **SLAs & Escalation:** Rapid legal review SLA for time-sensitive matters and escalation to outside counsel for high-risk agencies; train Support/Sales to route to Legal.
- **Controlled Interfaces:** Eliminate informal contact paths; all interactions flow through the governed interface.

## Epic 6 — Cross-Border & Conflict-of-Laws Engine

- **Data Locality:** Tag data by region/tenant and enforce locality in access tools.
- **Decision Trees:** Codify cross-border handling (local order vs foreign request vs MLAT) with blocking statute and secrecy law checks.
- **Safeguards:** Apply SCCs, DPAs, minimization, and redaction; document rationale and approvals for every decision.
- **Counsel Network:** Maintain local counsel roster and negotiation playbooks to narrow scope; provide “can’t comply as asked” templates with alternatives.
- **Tooling Controls:** Remove or harden tools that permit cross-region exports without policy enforcement.

## Epic 7 — Internal Investigation Protocol

- **Triggers & Roles:** Define triggers (whistleblower, fraud, misuse, harassment) and roles (Legal lead, HR lead, Security lead, scribe) with intake triage and anti-retaliation safeguards.
- **Evidence Handling:** Privilege rules for employee devices/accounts; chain-of-custody logging and interview documentation standards.
- **Remediation Workflow:** Containment → root cause → prevention; define board/committee reporting thresholds and discipline process.
- **Case Register:** Confidential case register with access controls and “lessons shipped” requirement for systemic prevention.
- **Anti-Shadowing:** Prohibit manager-run shadow investigations outside protocol.

## Epic 8 — External Messaging & Narrative Control

- **Comms Playbooks:** Regulator inquiry, raid/warrant, leak, litigation filing with pre-approved holding statements (truthful, minimal, non-speculative).
- **Speaker Controls:** Named spokesperson list with training; internal comms templates that state what happened, what to do, and what not to do.
- **Monitoring & Escalation:** Media monitoring triggers; customer comms decision tree; investor/board update rules by materiality.
- **War-Room Hygiene:** Document retention plus “no new commentary” rule during matters; enforce war-room etiquette to prevent improvisational Slack speculation.

## Epic 9 — Program Governance & Auditability

- **Policy Suite:** Publish investigations policies for requests, holds, productions, and comms; maintain KPIs (time-to-triage, time-to-preserve, time-to-produce, defect rate) and costs per matter.
- **Exceptions Registry:** Exec-signed exceptions with expiry; quarterly readiness audits covering holds, tool access, chain-of-custody, and playbook compliance.
- **Training & Vendors:** Annual all-staff training plus role-based deep dives; vendor readiness for eDiscovery, forensics, local counsel, and PR.
- **Board Reporting:** Append board-ready metrics (volume, categories, posture, trends) and run two full-scale drills per year (one cross-border, one law enforcement).
- **Continuous Improvement:** Post-matter retros with one systemic fix shipped; institutionalize the rule: respond like it will be litigated—because it will.

## Operating Model & Governance

- **Authority & Intake:** Legal owns intake; Security co-owns validation; Executive sponsor arbitrates tie-breakers. All requests get a matter ID before work starts.
- **Tooling Backbone:** Central case management workspace with linked evidence log, hold issuance, deadline tracker, and redaction/production pipeline; access is role-scoped with audit trails.
- **Controls & Assurance:** Quarterly drills and audits feed a readiness scorecard; exceptions expire automatically and require executive renewal.

## Phased Delivery Plan

1. **Week 1–2: Charter & Intake Hardening** — Publish definitions, authority matrix, severity rubric, single intake, matter ID/log, SLA matrix, and comms rules; enforce “no direct replies.”
2. **Week 3–4: Hold & Triage Automation** — Ship standardized intake form, validity checks, hold triggers with automated notices/acks, deadline tracker with escalations, and triage memo template.
3. **Week 5–6: Collection & LE Playbooks** — Stand up collection toolkit with chain-of-custody, redaction workflow, production standards, and law enforcement playbooks with secure delivery.
4. **Week 7–8: Cross-Border & Internal Investigations** — Implement data locality tagging, cross-border decision trees, counsel roster, internal investigation protocol, and confidentiality controls.
5. **Week 9–10: Governance, Training & Drills** — Launch policy suite, KPI dashboards, exceptions registry, annual/role-based training, and execute two tabletop drills with retros.

## Forward-Leaning Enhancements

- **Automated Verification Bot:** ChatOps bot that validates request authenticity (headers/metadata/domain), checks scope against templates, and pre-populates the intake form.
- **Evidence Integrity Ledger:** Append-only hash chain for evidence manifests to simplify audit/attestation during productions.
- **Risk-Adaptive SLAs:** Dynamic SLA adjustments driven by severity rubric and data classification, with automatic exec paging for p0 matters.
