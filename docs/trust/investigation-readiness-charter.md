# Investigation Readiness Charter

This charter operationalizes how Summit handles government matters, law enforcement requests, cross-border demands, and internal investigations. It is designed for immediate execution on the current stack: single intake channel, privileged chain-of-custody logging, policy-driven holds, and auditable response workflows.

## Epic 1 — Government Matter Definition & Authority

- **Government matter scope:** subpoenas, civil investigative demands (CID), search warrants, 2703(d) orders, emergency requests, MLAT/foreign legal process, and any informal government outreach seeking data or action.
- **Decision authority:** Legal lead (primary), Security lead (co-equal on technical feasibility/risk), Exec sponsor for high-risk/high-profile matters; authority matrix documents thresholds by data sensitivity, jurisdiction, and PR risk.
- **Severity rubric:** score by legal risk × operational impact × PR risk; levels drive deadlines, staffing, and comms approvals.
- **Single intake:** all requests routed to the intake queue (no direct responses); employees must forward immediately.
- **Matter hygiene:** assign matter ID, timeline, and evidence log on intake; privilege labeling required (who is “inside the tent”).
- **SLA matrix:** response times by request type and severity, with escalation triggers to exec/board for high-risk items.
- **Comms rules:** pre-approved internal/external guidance; deviations require logged exception with expiry.
- **Tabletops:** quarterly drills covering subpoena + press leak + system outage; purge ad-hoc employee replies.

## Epic 2 — Intake & Triage Factory

- **Standard intake form:** agency, authority, request type, scope, deadline, service method, data subjects/tenants implicated.
- **Validity checks:** confirm service/jurisdiction, scope minimization, and authority; log basis to proceed (comply/narrow/object/quash).
- **Data classification:** tag PII/PHI/PCI/biometrics and special regimes; note notice prohibitions/allowances.
- **Cross-border analysis:** residency conflicts, blocking statutes, transfer constraints, and SCC/DPA posture.
- **Ownership:** name legal lead, custodians, and technical data owners; open matter workspace with tasks/timeline.
- **Preservation triggers:** targeted holds only; auto reminders for deadlines; serious matters require triage memo within 24 hours.

## Epic 3 — Legal Hold & Preservation

- **Trigger matrix:** holds by matter type (subpoena vs warrant vs civil demand); apply to custodians, systems, and date ranges.
- **Automation:** templated hold notices with acknowledgments; tracked responses; surgical suspension of retention/deletion only where required.
- **Coverage:** include ephemeral sources (chat, tickets, CI/CD, cloud audit trails) and state snapshots (configs, access lists).
- **Chain of custody:** hash and log every collected artifact; hold release process verifies resumption of normal retention.
- **Governance:** quarterly hold audits; manager training that “hold means stop,” not “export everything.”

## Epic 4 — eDiscovery & Collection Pipeline

- **Data source map:** SaaS, DBs, object stores, logs, email, chat with approved collection methods per source (API export, snapshots, vendor tools).
- **Toolkit:** hashing, manifests, access controls; dedupe and scope controls to prevent over-collection.
- **Redaction & review:** policy-backed redaction for sensitive/irrelevant data; privilege and relevance review before production.
- **Production standards:** load files/indexes/manifests with audit logs for all exports; maintain cost controls and early case assessment.
- **Validation:** quarterly mock productions to test speed and integrity; forbid ad-hoc engineer exports (gateway required).

## Epic 5 — Law Enforcement Request Handling

- **Playbooks by type:** subpoena, 2703(d), warrant, emergency, MLAT/foreign orders with strict identity/authority verification steps.
- **Exigent policy:** defined approvers and required evidence; minimal responsive data only.
- **Least-data principle:** produce only compelled scope; track customer notice rules and gag-order expirations.
- **Delivery:** secure, encrypted, and logged transfer; transparency report inputs captured (counts by type when publishable).
- **Escalation:** rapid legal review SLA; outside counsel path for high-risk agencies; staff training to route all requests to Legal.

## Epic 6 — Cross-Border & Conflict-of-Laws Engine

- **Data tagging:** region/tenant home enforced in access tools; block cross-region exports without policy exception.
- **Decision tree:** local order vs foreign request vs MLAT with documented safeguards (SCCs, minimization, redaction).
- **Checks:** blocking statutes and secrecy laws for priority geos; customer contract notice/cooperation clauses verified.
- **Documentation:** rationale and approvals for every cross-border decision; template for “cannot comply as asked” alternatives.
- **Exercises:** quarterly tabletop on foreign subpoena vs EU residency commitments; maintain local counsel roster.

## Epic 7 — Internal Investigation Protocol

- **Triggers:** whistleblower, fraud, data misuse, harassment, safety concerns.
- **Roles:** Legal lead, HR lead, Security lead, scribe; retaliation safeguards baked into intake.
- **Evidence handling:** privilege and custody rules for employee devices/accounts; interview protocol and documentation standards.
- **Remediation:** containment → root cause → prevention with “lessons shipped” requirement; discipline/termination process documented and consistent.
- **Governance:** reporting thresholds to board/committees; confidential case register; ban shadow investigations by managers.

## Epic 8 — External Messaging & Narrative Control

- **Playbooks:** regulator inquiry, raid/warrant, leak, litigation filing with pre-approved truthful holding statements.
- **Spokespeople:** designated list with training; internal comms templates (what happened / what to do / what not to do).
- **Monitoring & escalation:** media monitoring triggers; customer comms decision tree (notify vs prohibited vs strategic); investor/board update rules by materiality.
- **Controls:** maintain facts-only timeline; enforce “no new commentary” rule during matters; quarterly comms tabletop; enforce war-room etiquette to stop speculative Slack chatter.

## Epic 9 — Program Governance & Auditability

- **Policy suite:** publish investigations policies (requests, holds, productions, comms) with versioning and ownership.
- **KPIs:** time-to-triage, time-to-preserve, time-to-produce, defect rates; cost per matter with early case assessment tracking.
- **Controls:** exception registry with expiry and exec sign-off; quarterly readiness audits (holds, tool access, chain-of-custody, playbook compliance).
- **Training:** annual all-hands; role-based deep training for responders; vendor readiness for eDiscovery/forensics/local counsel/PR.
- **Drills & improvement:** two full-scale drills per year (cross-border and law enforcement); post-matter retros with at least one systemic fix shipped; principle: **respond like it will be litigated—because it will.**

## Forward-Looking Enhancements

- **Tamper-evident evidence ledger:** extend the provenance ledger to track legal holds, collections, and productions with hash chains and per-matter manifests for defensibility.
- **Automated deadline radar:** timeline-aware reminders that integrate with incident and ticketing systems to prevent SLA misses for legal response windows.
- **Cross-border access guardrails:** policy engine hook that blocks cross-region exports unless an approved exception with expiry exists, coupled with just-in-time oversight by Legal.
