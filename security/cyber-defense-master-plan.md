# Cyber Defense Program Blueprint

This document operationalizes the 11 CYBINT/SIGINT priorities with production-ready deliverables, architecture notes, and validation steps. It favors defensive hardening, rigorous testing, and clear runbooks.

## Program Guardrails
- **Safety first:** defense-only, no offensive tooling. All lab simulations use isolated, non-production assets.
- **Telemetry quality:** normalize timestamps/time zones, enforce schema contracts, and monitor ingest lag/error budgets.
- **Change control:** every control ships with owner, rollback plan, and regression tests (unit + replay + chaos drills).
- **Metrics:** precision/recall where measurable, MTTR/MTTD, suppression rates, and coverage per MITRE tactic.

## 1) MITRE ATT&CK Coverage & Blind Spots
- **Inventory:** export current SIEM/SOAR/EDR/NDR rules; map to ATT&CK T/TAs. Generate a heatmap and gap list ranked by threat model.
- **Data requirements:** document required log sources per tactic (auth, DNS, proxy, EDR, cloud control plane) and freshness SLOs.
- **Validation:** add atomic/synthetic tests per gap; track pass/fail in CI and scheduled nightly replays.
- **Deliverables:** coverage dashboard, prioritized backlog with owners/severity, regression test suite, and tuning notes.

## 2) Sigma Rules & SOAR Playbooks for Named APTs
- **Input:** latest TTPs/IOCs (e.g., Volt Typhoon, UNC2452) normalized to ATT&CK.
- **Detection engineering:** host + network Sigma rules with required fields, FP tuning guidance, and suppression lists.
- **SOAR:** enrichment (VT/WHOIS/sandbox), containment (account disable/isolation), comms (Slack/Email), and ticketing with SLA tags.
- **Testing:** replay pcaps/EDR logs in lab; measure FP rate on production-like telemetry before rollout.

## 3) Kerberos Lateral Movement Simulation + Zeek/eBPF Detections
- **Lab scenarios:** abnormal TGS volume, unusual encryption types, AS-REP anomalies using controlled test principals.
- **Detections:** Zeek scripts for ticket storms/unusual services; eBPF for process-to-socket correlation and lateral tool fingerprints.
- **Validation:** repeatable runbooks, baseline thresholds, and suppression for backup jobs/legit bulk auth.

## 4) CI/CD SLSA 3+ with SBOM & Provenance
- **Pipeline hardening:** isolated builders, hermetic dependencies, pinned toolchains, and binary provenance (in-toto/Sigstore).
- **SBOM:** automated generation (Syft/CycloneDX) per artifact; stored with releases and scanned on ingest.
- **Policy gates:** slsa-verifier and admission controls to block unsigned or non-compliant artifacts.
- **Testing:** reproducibility checks, dependency diff alerts, and periodic supply-chain tabletop tests.

## 5) Quarantine for Untrusted Artifacts (cosign + policy-controller)
- **Trust policy:** signed-by constraints, subject claims, freshness/expiry, and environment allowlists.
- **Enforcement:** policy-controller/OPA gate sends non-compliant images to quarantine registry; alerts routed to SOAR with severity mapping.
- **CI integration:** keyless cosign signing, attestation upload, and provenance links in release notes.

## 6) Identity Tripwires for High-Risk Admins
- **Honeytokens:** decoy accounts/keys with high-fidelity alerts and tamper-evident logging.
- **Step-up controls:** enforce MFA/WebAuthn for privileged actions; session recording for admin consoles.
- **Analytics:** detections for impossible travel, MFA fatigue, privilege escalations, and dormant account use.

## 7) ABAC via OPA/Rego for Sensitive Data
- **Attributes:** user risk tier, device posture, data sensitivity, geo/time, and request context.
- **Policies:** Rego bundles with unit tests; deny-by-default with explicit allow; versioned and promoted through environments.
- **Observability:** decision logs to SIEM; dashboards for deny reasons and drift.

## 8) RF Anomaly Detection (Wi-Fi/IoT)
- **Data:** public RF datasets plus local benign captures; features include RSSI variance, spectral entropy, and modulation anomalies.
- **Models:** isolation forest and autoencoders with sliding-window inference; calibrate thresholds per site noise floor.
- **Ops:** streaming pipeline with retraining cadence, canary sensors, and alert grading (info/warn/critical).

## 9) Spectrum Sensors for Rogue Emitters/Jammers
- **Deployment:** GPS/time-synced sensors, hardened storage, and signed firmware.
- **Analytics:** power spike thresholds, channel occupancy anomalies, jammer signatures, and multi-sensor triangulation.
- **Response:** runbooks for on-call, escalation, and coordinated physical validation.

## 10) Campaign Graph: IOCs/TTPs to Mitigations
- **Graph model:** normalize to STIX/TAXII; nodes for IOCs, TTPs (ATT&CK), assets, detections, and mitigations.
- **Scoring:** prevalence, criticality, blast radius; prioritize gaps and auto-generate mitigation plans.
- **Interfaces:** saved queries for affected assets, what-if blast radius, and exportable reports for leadership.

## 11) Abnormal Logon Clustering Across Cloud/IdP
- **Normalization:** unify auth/VPN/IdP logs with consistent fields (user, device, src IP/ASN, method, geo, MFA).
- **Features:** time-of-day rarity, device novelty, IP reputation, session length, and privilege change proximity.
- **Models:** unsupervised clustering + rules for impossible travel/new device + privilege action; feedback loop to suppress benign patterns.

## Cross-Cutting Implementation Plan
- **Phases:** lab → limited prod → full rollout with progressive tuning and kill switches per control.
- **Testing:** unit + replay suites, chaos/tabletop exercises, and scheduled red-team-informed simulations.
- **Governance:** owners per control, SLA-backed response playbooks, and quarterly control effectiveness reviews.
- **Observability:** dashboards for alert volume, FP/TP ratios, coverage %, and policy decision metrics with SLOs.
- **Docs:** runbooks, policy references, suppression/tuning guides, and onboarding checklists for new analysts.

## Roadmap (Indicative)
- **Weeks 1-2:** coverage inventory, lab infra, SLSA gap analysis, initial Sigma drafts, ABAC schema definition.
- **Weeks 3-5:** deploy provenance/SBOM automation, Kerberos detections in lab, ABAC Rego tests, honeytokens, SOAR playbooks.
- **Weeks 6-8:** policy-controller enforcement + quarantine registry, RF model canaries, campaign graph MVP, auth anomaly pipeline beta.
- **Weeks 9-12:** full prod rollout with KPIs, training/onboarding, quarterly review schedule, and continuous improvement loop.
