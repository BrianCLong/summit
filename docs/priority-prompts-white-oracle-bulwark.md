# WHITE / ORACLE / BULWARK / CITADEL Priority Prompt Completions

This playbook provides ready-to-deploy responses for prompts 12–22 across governance, threat intelligence, incident response, and identity threat defense. Each scenario includes goals, execution steps, automation hooks, and measurable success criteria.

## 12. Audit-ready evidence for incident response (NIST 800-53)
- **Goal:** Produce defensible, exportable evidence for IR controls mapped to IR, AU, CP, and SI families.
- **Approach:**
  1. Map IR SOPs and runbooks to control IDs (e.g., IR-4, IR-5, IR-8) with traceability to detection sources.
  2. Instrument evidence capture (case metadata, timestamps, responder IDs, chat/transcript exports) via SOAR playbooks.
  3. Enforce ticketing invariants (severity, containment clock start/stop, comms approvals) with policy-as-code checks.
  4. Generate automated control attestations (PDF/CSV) that bundle logs, approvals, and sign-offs per incident.
- **Automation hooks:** SOAR workflow for evidence bundle; nightly job to refresh control coverage matrix; integrity checksums for exported artifacts.
- **Success metrics:** ≥95% incidents with complete control evidence; <2 hours SLA for evidence bundle after close; zero missing sign-offs in quarterly samples.

## 13. OPA policies for data classification and access (deny-by-default)
- **Goal:** Enforce data class-based access using OPA with auditable decisions and minimal blast radius.
- **Approach:**
  1. Normalize taxonomy: `public`, `internal`, `confidential`, `restricted`, `highly_restricted` with ownership metadata.
  2. Author Rego policies for CRUD paths using attributes (role, purpose, location, device posture, break-glass flag) and default deny.
  3. Emit decision logs to a tamper-evident store; enrich with requestor identity, resource labels, and justification.
  4. Integrate with gateways (API, DB proxy, S3/GCS) using sidecar/bundle distribution and staged rollout (shadow → enforce).
- **Automation hooks:** CI tests for policy regression; drift detection on bundle digests; alert on missing justifications for elevated access.
- **Success metrics:** 100% resources labeled; <0.5% policy regression in canaries; decision logs available for ≥180 days with integrity proofs.

## 14. Data retention with PETs (differential privacy, k-anonymity)
- **Goal:** Balance analytics utility with privacy guarantees across pipelines.
- **Approach:**
  1. Define retention classes (raw, sanitized, aggregates) with max age and deletion method (cryptographic erasure preferred).
  2. Apply DP noise to aggregates; enforce k-anonymity (k≥10) for quasi-identifiers before sharing.
  3. Build deletion workflows tied to lineage (lake → warehouse → derived marts) with provable deletes and tombstones.
  4. Add privacy budget accounting per dataset and reject queries exceeding ε thresholds.
- **Automation hooks:** Scheduled retention audits; CI checks on schemas to flag PII; synthetic data generators for non-prod.
- **Success metrics:** 100% datasets with retention class; zero overdue deletes; privacy budget overruns auto-blocked with alerting.

## 15. Correlate attacker infrastructure (passive DNS + SSL certs)
- **Goal:** Link campaigns via shared DNS and certificate artifacts to raise confidence in clustering.
- **Approach:**
  1. Collect passive DNS (PDNS), CT logs, JA3/JA4 hashes, and hosting ASN/geo history.
  2. Build feature graph (domain ↔ IP ↔ cert fingerprint ↔ registrar) and weight edges by recency/uniqueness.
  3. Score clusters using overlap (co-occurrence windows), burner/fast-flux heuristics, and certificate reuse rarity.
  4. Feed high-confidence nodes to blocking and watchlists; document pivot seeds and evidence.
- **Automation hooks:** Scheduled ETL from PDNS/CT; graph queries for new overlaps; enrich with WHOIS risk flags.
- **Success metrics:** ≥30% uplift in infra overlap findings quarter-over-quarter; false-positive rate <5% in sampling; time-to-block <30 minutes after cluster confirmation.

## 16. Early-warning tripwires (decoy cloud assets & token leakage)
- **Goal:** Detect adversary reconnaissance and credential misuse early.
- **Approach:**
  1. Deploy labeled decoy assets (buckets, service principals, DNS entries) with canary permissions and observable access.
  2. Seed unique honey tokens across repos, CI secrets, and docs; monitor egress and use via webhook callbacks.
  3. Route hits to SOAR for auto-enrichment (source IP, ASN, user agent) and conditional auto-block on high risk.
  4. Maintain allowlists for expected scanners; rotate decoys quarterly to avoid staleness.
- **Automation hooks:** IaC modules for decoy provisioning; alert deduplication rules; suppression windows for red-team ops.
- **Success metrics:** MTTD <5 minutes for token/decoy touches; ≥90% of alerts enriched with attribution context; zero production impact during decoy engagement.

## 17. Third-party exposure mapping (Shodan/Censys + leaked creds)
- **Goal:** Continuously inventory and risk-rank vendor/partner exposure.
- **Approach:**
  1. Maintain vendor asset catalog (domains, ASNs, IP ranges, SaaS tenants) with business criticality tags.
  2. Query Shodan/Censys for exposed services; correlate with leaked credential telemetry and known vulns.
  3. Score findings (CVSS + exploitability + business criticality) and push tickets with SLA tiers.
  4. Share sanitized indicators via TLP; track remediation and retest cadence.
- **Automation hooks:** Weekly scans with delta reporting; credential leak webhooks; auto-ticket creation by tier.
- **Success metrics:** Coverage ≥95% of tracked vendors; remediation SLA compliance ≥90%; mean time to notify <24 hours from detection.

## 18. MTTR reduction via telemetry vs. response step analysis
- **Goal:** Identify automation candidates to shorten containment/recovery.
- **Approach:**
  1. Instrument playbooks with timing markers (detect → triage → contain → recover).
  2. Correlate alert types with manual steps; rank by frequency × duration to find top automation targets.
  3. Implement low-regret automations (enrichment, containment toggles, comms templates) with guardrails and approvals.
  4. Track MTTR pre/post and iterate quarterly with new baselines.
- **Automation hooks:** SOAR step timers; BI dashboards for latency hotspots; feature flags for automation rollout.
- **Success metrics:** ≥25% MTTR reduction for top 5 alert classes; rollback rate <2%; responder satisfaction trend upward QoQ.

## 19. Tiered ransomware response matrix
- **Goal:** Pre-bake actions by detection timing and blast radius to avoid decision delay.
- **Approach:**
  1. Define tiers by timing (pre-encryption, during encryption, post-encryption) and impact (endpoint, segment, enterprise).
  2. For each tier, pre-authorize isolation, key revocation, snapshot lock, and comms templates.
  3. Link forensic capture requirements (volatile memory, disk images) and legal/compliance notifications.
  4. Rehearse quarterly with injects for backup integrity and negotiation decision trees.
- **Automation hooks:** EDR+NAC isolation macros; storage immutability toggles; DNS sinkhole triggers; comms bots for status pages.
- **Success metrics:** Isolation MTTD+MTTC <10 minutes in pre-encryption tier; backup verification success ≥98%; exercise action adherence ≥95%.

## 20. BEC tabletop with comms, containment, recovery artifacts
- **Goal:** End-to-end rehearsal with evidence-ready artifacts.
- **Approach:**
  1. Scenarios: invoice fraud, vendor compromise, payroll reroute. Define roles (IR lead, comms, legal, finance).
  2. Injects: suspicious email, mailbox rule creation, OAuth consent, wire request, MFA fatigue sequence.
  3. Outputs: comms templates (execs, customers, regulators), containment steps (token revocation, mail rule purge), and restitution workflow.
  4. Capture lessons with action owners, due dates, and policy updates (SPF/DKIM/DMARC, mail auth strength, RBAC for finance).
- **Automation hooks:** Simulated phishing platform for injects; audit logging verification; pre-built SOAR playbooks for mailbox hygiene.
- **Success metrics:** All injects processed within SLA; zero unlogged containment actions; remediation tasks closed within 30 days.

## 21. IdP risk-based authentication (step-up)
- **Goal:** Dynamically adjust auth based on risk signals.
- **Approach:**
  1. Ingest signals: geo-velocity, impossible travel, device health, network reputation, session age, and behavioral baselines.
  2. Define policies: low risk → silent allow; medium → WebAuthn step-up; high → block + forced device re-registration.
  3. Log all risk decisions with evidence; expose admin dashboards and hooks for downstream app session revocation.
  4. AB test friction vs. conversion; tune thresholds quarterly with fraud review board.
- **Automation hooks:** Risk engine scoring lambda; push notifications via FIDO2/WebAuthn; streaming exports to SIEM for drift alerts.
- **Success metrics:** MFA prompt rate contained to <3% of low-risk sessions; account-takeover rate down ≥30%; step-up success ≥95% without support tickets spike.

## 22. Defenses against MFA fatigue/push bombing (adversary emulation)
- **Goal:** Validate resilience to push-based attacks and improve user experience.
- **Approach:**
  1. Emulate attack chain: credential theft → repeated push spam → prompt bypass attempts → adversary-in-the-middle.
  2. Controls: number-matching/prompt details, rate limits, device binding, and rapid lockouts after anomalies.
  3. User protections: out-of-band reporting, "Are you logging in?" UX copy, and security nudges for risky approvals.
  4. Metrics review: false-approval rate, alert fatigue survey, and blocked attempts per week.
- **Automation hooks:** Chaos tests to simulate push floods; SOAR auto-block on multiple denials; training snippets embedded in push notifications.
- **Success metrics:** False approval rate <0.5%; mean push count per login <1.2; time-to-lockout <2 minutes after abnormal spikes.
