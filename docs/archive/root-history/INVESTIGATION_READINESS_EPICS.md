# Investigation Readiness Program (subpoenas, warrants, and cross-border matters)

## Epic 1 — Investigation Readiness Charter (treat subpoenas like incidents)

1. Define what counts as a “government matter” (subpoena, CID, warrant, informal request).
2. Establish decision authority: Legal lead + Security lead + Exec sponsor thresholds.
3. Create matter severity rubric (legal risk × operational impact × PR risk).
4. Stand up a single intake channel (no direct responses by individuals).
5. Implement a matter ID, timeline, and evidence log requirement.
6. Define privilege protocol (who’s inside, labeling rules, work-product hygiene).
7. Build a response SLA matrix (service deadlines, escalation triggers).
8. Pre-approve comms rules (what to tell staff, customers, partners).
9. Create an exceptions registry (any deviation must expire + be justified).
10. Run quarterly tabletop: subpoena + press leak + system outage.
11. Delete ad-hoc “helpful” replies from employees—everything routes to Legal.

## Epic 2 — Intake & Triage Factory (fast, accurate, controlled)

1. Build standardized intake form: agency, authority, scope, deadline, service method.
2. Verify validity and jurisdiction (service defects, scope overreach, authority).
3. Identify legal basis and response options (comply, narrow, object, move to quash).
4. Classify data implicated (PII/PHI/PCI/biometrics) and special rules.
5. Determine whether notice to customer/data subject is allowed or prohibited.
6. Evaluate cross-border conflicts (data residency, blocking statutes, transfer rules).
7. Assign custodian owners and technical data owners (named, accountable).
8. Open a matter workspace: tasks, timeline, artifacts, approvals.
9. Issue preservation hold triggers (targeted, not company-wide panic).
10. Build a deadline tracker with automatic reminders/escalations.
11. Produce a one-page “triage memo” within 24 hours for serious matters.

## Epic 3 — Legal Hold & Preservation (destroy nothing, bloat nothing)

1. Define hold triggers by matter type (subpoena vs warrant vs civil demand).
2. Implement targeted legal holds (custodians + systems + date ranges).
3. Automate hold notices and acknowledgments (tracked, auditable).
4. Freeze deletion/retention policies only where required (surgical holds).
5. Preserve ephemeral sources: chat, logs, tickets, CI/CD, cloud audit trails.
6. Capture “state snapshots” (configs, access lists) where relevant.
7. Implement chain-of-custody logging for every collected artifact.
8. Define hold release process (and verify deletion resumes correctly).
9. Audit hold compliance quarterly (ack rates, gaps, missed systems).
10. Train managers: “hold means stop,” not “export everything to your laptop.”
11. Delete informal “archive” practices that create uncontrolled copies.

## Epic 4 — eDiscovery & Collection Pipeline (produce defensibly, repeatably)

1. Create a data source map for discovery: SaaS, DBs, object stores, logs, email, chat.
2. Standardize collection methods per source (API export, snapshots, vendor tools).
3. Build a collection toolkit with hashing, manifests, and access controls.
4. Add dedupe and scoping controls (avoid overcollection).
5. Implement redaction workflow for sensitive/irrelevant data (policy-backed).
6. Create review pipeline: privilege review, relevance review, quality checks.
7. Maintain production metadata and audit logs for all exports.
8. Implement “production pack” format standards (load files, indexes, manifests).
9. Add cost controls: batch strategy, prioritization, early case assessment.
10. Run mock productions quarterly to validate toolchain and speed.
11. Eliminate ad-hoc exports from engineers’ machines—gateway or nothing.

## Epic 5 — Law Enforcement Request Handling (warrants, exigent, and “informal” asks)

1. Create playbook by request type: subpoena, 2703(d), warrant, emergency request, MLAT.
2. Define strict verification steps (agency identity, legal authority, scope).
3. Build “exigent request” policy (who approves, what evidence required).
4. Implement least-data principle: produce only what’s compelled.
5. Establish customer notice rules and a gag-order tracking process.
6. Build secure delivery mechanism for production (encrypted, logged).
7. Maintain transparency reporting inputs (counts by type, when publishable).
8. Train Support/Sales: never “help,” always route to Legal.
9. Add rapid legal review SLA for time-sensitive law enforcement matters.
10. Create escalation to outside counsel for high-risk/high-profile agencies.
11. Delete informal contact paths with agents—one controlled interface only.

## Epic 6 — Cross-Border & Conflict-of-Laws Engine (residency meets reality)

1. Tag data by region/tenant “home” and enforce locality in access tools.
2. Build decision tree for cross-border demands (local order, foreign request, MLAT).
3. Implement transfer safeguards (SCCs, DPA positions, minimization, redaction).
4. Create “blocking statute” and local secrecy law checks for key geographies.
5. Maintain local counsel roster for priority jurisdictions.
6. Create process for diplomatic/agency negotiation to narrow scope.
7. Implement customer contract checks for notice and cooperation duties.
8. Document every cross-border decision with rationale and approvals.
9. Build a “can’t comply as asked” template with alternative proposals.
10. Run quarterly tabletop: foreign subpoena vs EU residency commitments.
11. Remove tools that allow cross-region exports without policy enforcement.

## Epic 7 — Internal Investigation Protocol (when the call is coming from inside)

1. Define triggers for internal investigations (whistleblower, fraud, data misuse, harassment).
2. Establish investigation roles: Legal lead, HR lead, Security lead, scribe.
3. Implement intake triage and retaliation safeguards.
4. Set evidence handling and privilege rules (especially for employee devices/accounts).
5. Create interview protocol and documentation standards.
6. Build remediation workflow: immediate containment → root cause → prevention.
7. Define reporting thresholds to the board/committees.
8. Establish discipline and termination decision process (consistent, documented).
9. Implement “lessons shipped” requirement (systemic prevention, not only punishment).
10. Maintain an internal case register with confidentiality controls.
11. Delete shadow investigations by managers outside the protocol.

## Epic 8 — External Messaging & Narrative Control (silence is a strategy, not default)

1. Create comms playbooks: regulator inquiry, raid/warrant, leak, litigation filing.
2. Pre-approve holding statements (truthful, minimal, non-speculative).
3. Define who can speak: spokesperson list + training.
4. Create internal comms template: what happened, what to do, what not to do.
5. Implement media monitoring triggers and escalation paths.
6. Build customer comms decision tree (notify vs prohibited vs strategic).
7. Maintain a “facts only” timeline that can be shared safely if needed.
8. Create rules for investor/board updates (materiality thresholds).
9. Implement document retention and “no new commentary” rule during matters.
10. Run quarterly comms tabletop with Legal + PR + Support.
11. Delete improvisational Slack speculation via enforced war-room etiquette.

## Epic 9 — Program Governance & Auditability (make readiness measurable)

1. Publish the investigations policy suite (requests, holds, productions, comms).
2. Maintain KPIs: time-to-triage, time-to-preserve, time-to-produce, defects rate.
3. Track costs per matter and optimize with early case assessment.
4. Maintain exceptions registry with expiry + exec sign-off for high-risk deviations.
5. Quarterly readiness audit: holds, tool access, chain-of-custody, playbook compliance.
6. Annual training for all staff; role-based deep training for responders.
7. Maintain vendor readiness: eDiscovery tools, forensics, local counsel, PR firm.
8. Build a board appendix: matters volume, categories, posture, and trends.
9. Run two full-scale drills per year (one cross-border, one law enforcement).
10. Continuously improve: post-matter retrospective with one systemic fix shipped.
11. Institutionalize the rule: **respond like it will be litigated—because it will.**
