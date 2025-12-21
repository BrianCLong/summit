# Security Program North Star (Controls as a Product)

## Epic 1 — Security Program North Star (controls as a product)

1. Define security objectives: protect customers, protect revenue, protect trust.
2. Create Tier 0/1/2 asset classification (systems, data, workflows).
3. Build security roadmap mapped to top risks and top business outcomes.
4. Establish security decision rights and escalation ladder.
5. Implement “security release envelope” for Tier 0 changes (tests, rollback, monitoring).
6. Create a security risk register with owners and ship dates.
7. Publish security scorecard monthly (controls health, incidents, drift, exceptions).
8. Create an exceptions registry with expirations (no permanent waivers).
9. Run quarterly security table-tops and game days (breach, ransomware, insider).
10. Tie security posture to procurement acceleration (trust as revenue lever).
11. Delete “security as a yearly audit” mindset.

---

## Epic 2 — Asset Inventory & Attack Surface Reduction (you can’t defend what you can’t see)

1. Inventory assets: cloud accounts, services, endpoints, domains, certs, repos.
2. Classify assets by criticality and data type (Tier 0/1/2).
3. Implement continuous discovery (cloud inventory, DNS, SSO logs, CMDB-lite).
4. Close exposed services: public buckets, open admin ports, forgotten endpoints.
5. Standardize secure baselines for infra and apps (golden configs).
6. Implement patch SLAs and track compliance (OS, containers, dependencies).
7. Kill zombie environments and stale credentials/tokens.
8. Add “deletion quota” for old services, endpoints, and IAM roles monthly.
9. Implement certificates/keys rotation and expiry monitoring.
10. Track attack surface KPIs and reduce quarter-over-quarter.
11. Delete shadow infrastructure created outside IaC.

---

## Epic 3 — Identity Security & Privilege Control (the modern perimeter)

1. Enforce SSO + strong MFA for all internal and admin tools.
2. Implement SCIM and automated offboarding for all critical systems.
3. Remove shared accounts and enforce unique identities everywhere.
4. Deploy JIT elevation for privileged access with approvals and audit logs.
5. Implement quarterly (or monthly) access reviews for Tier 0 systems.
6. Standardize service account management: ownership, scopes, rotation, last-used.
7. Add anomaly detection for auth: impossible travel, privilege spikes, new admin grants.
8. Implement break-glass access with time-boxing and post-review.
9. Enforce device posture for privileged access where feasible.
10. Integrate identity events into immutable audit logs and SIEM.
11. Delete standing admin access for humans.

---

## Epic 4 — AppSec & SDLC Controls (ship fast, safely)

1. Implement CI security gates: SAST, dependency, secrets scanning (merge-gated).
2. Establish threat modeling for Tier 0/1 features (lightweight, repeatable).
3. Standardize secure coding patterns: auth, input validation, rate limiting, logging.
4. Implement SBOM generation and signed builds (supply chain integrity).
5. Create vuln management SLAs with ownership and dashboards.
6. Run regular pen tests and track remediation to closure.
7. Implement security-focused code review checklists and training.
8. Add “security regression tests” for known failures (never reintroduce).
9. Build bug bounty/VDP intake and triage (if appropriate).
10. Tie AppSec findings to roadmap capacity (fix root causes).
11. Delete “security debt” treated as optional.

---

## Epic 5 — Data Security & Privacy Engineering (minimize blast radius)

1. Classify data and map flows (PII, secrets, regulated data).
2. Implement encryption in transit and at rest with verified configs.
3. Add tokenization/envelope encryption for sensitive fields where needed.
4. Implement retention controls and verified deletion (drills).
5. Restrict access to sensitive data with JIT and audit logs.
6. Implement export controls and anomaly alerts for mass access.
7. Redact PII/secrets from logs by default (and enforce).
8. Segment regulated workloads and high-risk tenants where needed.
9. Maintain subprocessor posture and vendor risk controls.
10. Build DSAR and privacy request pipelines that actually work.
11. Delete “copy prod data to dev” practices.

---

## Epic 6 — Detection, Response, and Forensics (assume compromise)

1. Define security incident taxonomy and severity levels with SLAs.
2. Centralize logs: cloud audit, identity, app, network; set retention tiers.
3. Implement alerting for high-signal events (privilege escalation, exfil patterns).
4. Build incident runbooks and automate first-response steps.
5. Create forensics readiness: snapshots, chain-of-custody, evidence templates.
6. Implement kill switches: disable features, revoke tokens, isolate tenants quickly.
7. Run quarterly incident drills including Legal/Comms and customer notifications.
8. Maintain vendor breach and third-party incident protocol.
9. Track MTTD/MTTR and reduce with automation.
10. Create post-incident prevention backlog with deadlines and exec visibility.
11. Delete ad-hoc incident handling via email/DM.

---

## Epic 7 — Security Assurance & Trust Enablement (turn posture into revenue)

1. Build security evidence packs aligned to customer diligence needs.
2. Maintain trust center with accurate, verifiable claims.
3. Implement questionnaire deflection engine (answer once, reuse).
4. Provide customer audit logs and SIEM integration where needed.
5. Run continuous controls monitoring and publish internal scorecards.
6. Standardize DPAs/security addenda aligned to controls.
7. Train Sales/CS on security talk tracks and escalation.
8. Implement procurement fast lane for deals on standard posture.
9. Track security as a sales lever: time-to-close improvements, win rate.
10. Maintain incident history summaries (factual, contextual).
11. Delete “trust theater” artifacts that don’t match reality.

---

## Epic 8 — Third-Party & Supply Chain Security (your vendors are your vulnerabilities)

1. Inventory vendors and tier by criticality and data access.
2. Enforce minimum security bar: SSO/MFA, incident notice, audits, retention.
3. Standardize vendor security assessments (lite/standard/deep).
4. Implement vendor access governance and quarterly reviews for Tier 0/1.
5. Track subprocessors and require notifications/approvals where needed.
6. Monitor vendor security advisories and patch exposure quickly.
7. Build exit plans for critical vendors (data export, deletion attestations, continuity).
8. Add software supply chain controls: dependency pinning, provenance, signed artifacts.
9. Implement secrets management and rotation policies across pipelines.
10. Run annual vendor incident tabletop for critical vendors.
11. Delete shadow vendors procured outside the process.

---

## Epic 9 — Security Governance & Culture (make it permanent)

1. Establish security council with Product/Eng/Legal and decision SLAs.
2. Maintain top-10 security risk register with mitigation ship dates.
3. Track security KPIs: patch compliance, access review completion, drift, incidents.
4. Tie security work to roadmap and error budgets (no shipping on fire).
5. Enforce exceptions registry expirations with exec escalation.
6. Run annual security training + role-based refreshers.
7. Reward teams for security fixes, deletion, and simplification.
8. Keep board appendix updated: posture, incidents, top risks, roadmap.
9. Benchmark against peers and standards where useful (without theater).
10. Automate evidence capture and reduce audit toil year over year.
11. Institutionalize the rule: **security is an operating system.**
