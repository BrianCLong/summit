## Epic 1 — Fraud/Abuse Taxonomy & Loss Model (measure the bleed)

1. Define abuse categories: account takeover, payment fraud, refund abuse, scraping, spam, insider misuse, marketplace fraud.
2. Create severity rubric: user harm, financial loss, legal exposure, reputational risk.
3. Build a loss model: direct $, support toil, chargebacks, churn, infra cost.
4. Establish “abuse KPIs”: loss rate, chargeback rate, ATO rate, false-positive rate.
5. Map abuse vectors to product surfaces (signup, auth, billing, exports, APIs).
6. Identify top 10 attacker playbooks seen (or plausible) and document them.
7. Create a risk register with owners and mitigation ship dates.
8. Define escalation triggers to Legal/Security/Comms for high-profile abuse.
9. Implement evidence standards (logs, timelines, decision trails) for enforcement actions.
10. Stand up weekly fraud/abuse review cadence with decision authority.
11. Delete vague categories like “weird behavior” — everything gets a label.

---

## Epic 2 — Identity Hardening Against ATO (stop the most expensive crime)

1. Enforce MFA/step-up auth for sensitive actions (exports, billing changes, admin grants).
2. Implement risk-based auth signals (device, IP reputation, impossible travel, velocity).
3. Add session hygiene: short-lived tokens, revocation, concurrent session controls.
4. Implement passwordless/SSO options and encourage adoption via product nudges.
5. Add login anomaly alerts and user-facing “recent sessions” view with revoke button.
6. Implement credential stuffing defenses (rate limits, bot detection, breached password checks).
7. Add email/domain takeover protections (domain verification, admin transfer controls).
8. Provide recovery flows with strong identity verification (and abuse-resistant).
9. Build “ATO response” playbook: contain, restore, notify, preserve evidence.
10. Add audit logs for auth events and privilege changes (immutable).
11. Remove legacy auth paths and weak recovery methods.

---

## Epic 3 — Payments Fraud & Chargeback Control (protect the revenue engine)

1. Baseline chargeback rate by segment, plan, geo, and acquisition channel.
2. Implement payment fraud scoring (issuer signals, velocity, device fingerprinting where lawful).
3. Add 3DS/SCA flows where appropriate (selective, risk-based to reduce conversion harm).
4. Enforce billing hygiene: AVS/CVV checks, retry logic, clear descriptors, receipts.
5. Implement refund governance: limits, cooling-off windows, escalation for high-risk accounts.
6. Create dispute evidence packs: invoices, usage, logs, delivery proof, comms.
7. Add “friendly fraud” detection (high usage + refund request patterns).
8. Monitor promo abuse and referral fraud (install farms, coupon stacking).
9. Build dunning flows that reduce involuntary churn without enabling fraud.
10. Create finance + support playbook for chargeback triage and response SLAs.
11. Delete “manual refunds by DM” — all refunds through audited workflow.

---

## Epic 4 — Abuse-Resistant Product Surfaces (make abuse expensive)

1. Rate limit signup, login, token creation, and high-cost endpoints by risk tier.
2. Implement bot defenses on public surfaces (signup, contact forms, free trial).
3. Add quotas and fairness controls for APIs and background jobs (tenant-scoped).
4. Implement export controls: approvals, throttles, anomaly alerts, and audit trails.
5. Create “sandbox mode” for new accounts: gradual capability unlock as trust grows.
6. Add content/reporting controls where relevant (spam flags, abuse reporting UX).
7. Implement anti-scraping protections (behavioral, tokenized links, signed URLs).
8. Add “device/session reputation” scoring for repeated offenders.
9. Create kill switches per feature surface (global + per-tenant).
10. Run monthly abuse red-team: attempt exploitation and document fixes.
11. Remove unauthenticated endpoints that leak valuable data.

---

## Epic 5 — Enforcement System (rules, appeals, receipts)

1. Define enforcement ladder: warn → throttle → suspend → terminate → legal escalation.
2. Implement automated enforcement for high-confidence signals (with audit logs).
3. Build an abuse case management tool: evidence, decisions, actions, timestamps.
4. Add an appeal process with strict SLAs and documented outcomes.
5. Create “false positive” controls: safe rollback and rapid restore paths.
6. Standardize ban evasion detection and device/account linking policies.
7. Implement partner/vendor enforcement hooks (marketplace apps, resellers, integrations).
8. Create policy-based messaging templates for enforcement notices (minimal, factual).
9. Maintain a “repeat offender” registry and stricter thresholds.
10. Track enforcement outcomes: recidivism, harm reduction, customer impact.
11. Delete ad-hoc enforcement by individual staff—everything through the system.

---

## Epic 6 — Trust & Safety Operations (scale without burnout)

1. Define T&S roles: analyst, investigator, policy owner, engineering liaison.
2. Create tiered queues: high-risk, financial fraud, ATO, policy violations, low-risk noise.
3. Implement routing rules and SLAs based on severity and customer tier.
4. Build runbooks for top 20 abuse scenarios with containment actions.
5. Add investigator tooling: timelines, session views, export logs, payment history.
6. Implement secure comms channels and confidentiality controls for sensitive cases.
7. Create training and calibration to keep decisions consistent.
8. Add quality review: sample cases weekly for correctness and bias checks.
9. Establish on-call rotation for high-severity abuse incidents.
10. Publish monthly T&S report internally: trends, wins, gaps.
11. Delete “tribal knowledge” by converting outcomes into playbooks.

---

## Epic 7 — Legal/Policy Alignment (enforceable rules, defensible outcomes)

1. Update Terms/AUP to clearly prohibit abuse categories you enforce against.
2. Align contract remedies: suspension/termination rights, cooperation duties, refunds policy.
3. Implement privacy-safe logging standards to support investigations.
4. Create regulator-ready documentation for enforcement and transparency (where applicable).
5. Define data retention for abuse logs and evidence (and deletion/DSAR handling).
6. Establish policy for law enforcement requests related to abuse (single intake path).
7. Build defamation/retaliation safeguards in enforcement comms (facts only).
8. Create cross-border considerations (sanctions, geo restrictions, local consumer laws).
9. Implement escalation to Legal for high-stakes enforcement (VIPs, press risk, litigation risk).
10. Maintain a policy change log and train staff on updates.
11. Delete “policy says X, ops does Y” drift via audits and gates.

---

## Epic 8 — Detection & Intelligence (see it early, not after Twitter)

1. Standardize telemetry for abuse signals (auth, billing, exports, API usage).
2. Build anomaly detection: spikes, unusual geos, new device clusters, rapid privilege grants.
3. Implement canary accounts/tokens to detect scraping and exfil attempts.
4. Add “attack funnel” dashboards: attempted → blocked → succeeded → loss.
5. Integrate vendor intel feeds where relevant (payment fraud signals, IP reputation).
6. Create threat intel loop: incidents → new rules → new detections.
7. Add “time-to-innocence” tools to quickly rule out suspected abuse.
8. Build alert tuning process to avoid paging on noise.
9. Implement post-deploy monitoring for abuse regressions (new loopholes).
10. Run quarterly intelligence reviews and update attacker playbooks.
11. Delete low-signal alerts; keep outcome-based detections only.

---

## Epic 9 — Governance & Metrics That Stick (abuse management as a system)

1. Create an Abuse Council (Product/Security/Legal/Finance/Support) with 48-hour decisions.
2. Maintain a scorecard: loss rate, chargebacks, ATO rate, time-to-contain, false positives.
3. Set quarterly targets and tie roadmap capacity to abuse risk (error budgets for fraud).
4. Maintain exceptions registry (temporary relaxations expire automatically).
5. Require postmortems for major abuse events with one systemic fix shipped.
6. Publish “what we blocked” and “what we improved” internally monthly.
7. Track customer impact (blocked legit users) and actively reduce it.
8. Add ROI accounting: $ saved + toil reduced per mitigation shipped.
9. Run quarterly GameDays: ATO wave, promo abuse, mass export attempt.
10. Tie enforcement quality to performance expectations (consistency matters).
11. Institutionalize the rule: **abuse is a product problem, not a support problem.**
