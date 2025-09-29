# Risk & Compliance Automation MVP Plan

## Mission Overview

- **Objective:** Automate SBOM ingestion, CVE budgeting, and attestation enforcement to block risky merges and releases.
- **Timeline:** Six-week MVP delivering collector service, policy engine, dashboards, waiver UI, audit export, and deployment admission webhook.
- **Success Criteria:** Controls demonstrably prevent non-compliant pull requests and releases, runbooks are published, SLOs met for 30 days, and evidence bundles generated for audit.
- **Guardrails:** Favor automation over manual triage, keep attack surface minimal (least privilege, signed artifacts), and ensure observability for every control point.
- **Alignment:** Integrates with enterprise risk appetite, satisfies internal audit mandates, and creates reusable controls for future Track B automation investments.

## Deliverables & Outcomes

| Deliverable              | Description                                                                                   | Primary Owner        | Acceptance Evidence                                                                           |
| ------------------------ | --------------------------------------------------------------------------------------------- | -------------------- | --------------------------------------------------------------------------------------------- |
| Collector service        | Signed SPDX ingestion, signature verification, normalized storage, and metrics emission.      | Platform Engineering | Successful synthetic probe uploads, verification logs, ingestion dashboards meeting SLO.      |
| Vulnerability aggregator | NVD/GHSA/vendor feed processing with dedupe, weighting, and `/vulns` API exposure.            | Security Engineering | Feed freshness <5m, false positive validation results, regression test suite coverage report. |
| Policy engine            | CVE budget enforcement, waiver integration, admission webhook, CLI linting.                   | Platform Engineering | Merge block demo with actionable diff, release gate denial with attestation failure reason.   |
| Waiver UI                | Dual-approval workflow, justification capture, expiration management, tamper-evident logging. | DevX/Tooling         | End-to-end approval demo, ledger hash verification report, latency metrics meeting SLA.       |
| Dashboards & reporting   | Grafana/Looker dashboards, weekly executive snapshot, evidence export pipeline.               | Compliance & Audit   | Dashboard links, signed evidence bundle, weekly status packet archived.                       |
| Audit export             | Immutable JSON/CSV/PDF bundle accessible via signed URL with access logging.                  | Compliance & Audit   | Download audit log entry, checksum validation, retention policy confirmation.                 |

## Resourcing & Stakeholders

| Role                 | Commitment | Responsibilities                                                                               |
| -------------------- | ---------- | ---------------------------------------------------------------------------------------------- |
| Product Lead         | 0.5 FTE    | Backlog curation, KPI tracking, cross-team coordination, status communications.                |
| Security Engineering | 2 FTE      | Ingestion fidelity, policy definition, waiver governance, attestation validation.              |
| Platform Engineering | 2 FTE      | Service development, deployment strategy, infrastructure as code updates, SLO instrumentation. |
| DevX/Tooling         | 1 FTE      | Developer integrations (CLI, Git checks), documentation, waiver UI operations.                 |
| Compliance & Audit   | 0.5 FTE    | Evidence review, control attestation, regulator coordination, WORM storage audits.             |
| SRE                  | Shared     | Synthetic probes, on-call readiness, rollback runbooks, DR exercises.                          |

## Scope & Capabilities

1. **SBOM Collector & Vulnerability Aggregator**
   - Accept signed SPDX 2.3 JSON via `/sboms` with schema validation, signature verification (cosign/GPG), and tamper-evident storage.
   - Correlate SBOM components with NVD, GHSA, and vendor advisories, enhancing with CVSSv3, EPSS, KEV flags, and package PURLs; expose via `/vulns`.
   - Maintain waiver registry with expiry, justification, and approver metadata; support `/waivers?expires_before=` filtering and upcoming lapse notifications.
2. **CVE Budget Policy Engine**
   - Configurable thresholds per severity (Critical, High, Medium, Low) plus exploitability boost for KEV/EPSS >0.7; repo/environment specific budgets stored as code.
   - Enforce merge blocks and release holds through `/policy/decision` REST, GitHub/GitLab status checks, and CLI linting. Responses include violating CVEs, impacted packages, and remediation hints.
   - Integrate waiver workflow with approval routing, expiration reminders (Slack/Email), hash-chained audit log, and automatic expiry revocation.
3. **Attestation Verification Gate**
   - Validate cosign and in-toto attestations before deployment via admission webhook; confirm provenance (builder ID, materials) and trusted registry image digests.
   - Verify least-privileged tokens for registry access and ensure revocation list monitored; block unsigned or stale attestations.
   - Persist attestation decisions alongside policy evaluations for evidence bundle export.
4. **Track B: Risk Scoring Enhancements**
   - Prototype exploitability + runtime reachability scoring (coverage from runtime telemetry); feed optional multiplier into budget engine and dashboards.
   - Deliver recommendation backlog for post-MVP hardening informed by pilot results.

## Architecture Overview

- **Collector Service:** Event-driven ingestion (SQS/Kafka) processes SBOM uploads, verifies signatures, stores normalized components/dependencies in Postgres, and emits metrics (`sbom_ingest_latency`).
- **Vulnerability Aggregator:** Scheduled workers fetch NVD/GHSA/advisory feeds, deduplicate via PURL/CPE heuristics, compute severity weights, and update materialized views consumed by policy engine.
- **Policy Engine:** Stateless service evaluating repo/environment context, CVE budgets, waivers, and attestations. Exposes REST endpoints and Kubernetes admission webhook. Deploy with horizontal autoscaling and 200ms p95 target.
- **Waiver UI:** Lightweight React frontend backed by `/waivers` for submission, approval, and audit; integrates SSO and role-based approvals.
- **Dashboards & Data Warehouse:** Metrics pushed to Prometheus + Grafana; nightly job exports JSON/CSV evidence to secure bucket; Looker/Mode dashboards show trends.
- **Tamper-Evident Logging:** Append-only store (e.g., DynamoDB + QLDB digest) records waivers and policy decisions with cryptographic chaining.

## Interfaces & Integrations

| Interface          | Producer → Consumer                       | Protocol                     | Contract Notes                                                                                                                                                                     |
| ------------------ | ----------------------------------------- | ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/sboms`           | CI pipelines → Collector service          | HTTPS POST (JSON, SPDX 2.3)  | Requires cosign signature header; response includes normalized `sbom_id` and validation summary.                                                                                   |
| `/vulns`           | Policy engine/UI → Aggregator service     | HTTPS GET (JSON)             | Supports filtering by `repo`, `package_purl`, `cve_id`, and `kev_flag`; paginated with ETag caching.                                                                               |
| `/waivers`         | Waiver UI → Policy engine                 | HTTPS CRUD (JSON)            | POST validates justification length ≥200 chars, auto-populates expiry ≤30 days, writes hash chain entry.                                                                           |
| `/policy/decision` | GitHub/GitLab checks, CLI → Policy engine | HTTPS POST (JSON)            | Input includes repo, commit SHA, environment, candidate image digest; response enumerates blocking CVEs, waiver references, attestation verdict, and actionable remediation steps. |
| Admission Webhook  | Kubernetes API server → Policy engine     | HTTPS POST (AdmissionReview) | Denies deployment if attestation invalid or budgets exceeded; returns machine + human readable reason for change log.                                                              |
| Audit Export       | Compliance portal → Evidence S3 bucket    | Signed URL download          | Exports zipped JSON/CSV/PDF bundle with SHA-256 manifest; access logged for audit.                                                                                                 |

**External Dependencies**

- GitHub/GitLab APIs for status checks, PR metadata, and comment updates.
- Identity provider (SSO) for waiver UI RBAC and approver attestations.
- Secrets manager for signing keys, registry credentials, and webhook tokens.
- Observability stack (Prometheus, Grafana, Loki, Tempo) for metric/log/trace ingestion.

## Team & Ownership

- **Product Lead:** Defines CVE budgets, tracks milestone progress, and curates backlog for Track B enhancements.
- **Security Engineering:** Owns vulnerability ingestion quality, waiver policy, and attestation verification rules.
- **Platform Engineering:** Builds collector, policy engine, and webhook integrations; ensures Kubernetes rollout strategy and runtime reliability.
- **DevX/Tooling:** Maintains CLI linting, developer documentation, and GitHub/GitLab app configuration.
- **Compliance & Audit:** Reviews evidence bundles weekly, validates tamper-evident log integrity, and coordinates regulator handoffs.
- **Site Reliability Engineering:** Owns SLO guardrails, synthetic probes, and go/no-go automation for deploy stages.

Communication cadences include daily Slack sync, twice-weekly standups, and a Thursday compliance review focused on waiver ledger changes and SLO adherence.

## Data Contracts & Storage

| Artifact              | Location                        | Key Fields                                                                                     |
| --------------------- | ------------------------------- | ---------------------------------------------------------------------------------------------- |
| SBOM documents        | S3 `sboms/` bucket (versioned)  | `sbom_id`, `source_repo`, `component`, `digest`, `signature`                                   |
| Vulnerability records | Postgres `vulnerabilities`      | `cve_id`, `package_purl`, `severity`, `cvss`, `epss`, `kev_flag`, `source_feed`, `last_seen`   |
| Waivers               | Postgres `waivers` + tamper log | `waiver_id`, `scope`, `severity`, `requestor`, `approvers`, `expiry`, `hash_prev`, `hash_curr` |
| Policy configs        | GitOps repo (`policies/*.yaml`) | `service`, `environment`, `budgets`, `exceptions`, `notifications`                             |
| Attestation decisions | Postgres `attestations`         | `image_digest`, `attestor`, `status`, `policy_version`, `decision_time`, `latency_ms`          |

## Definition of Ready (DoR)

- CVE budget thresholds ratified by Security, SRE, Product Ops, and linked in tracker.
- Waiver workflow, approver matrix, and SLA documented; sample waiver request templates created.
- Container registry credentials issued with least privilege and attestation verification access confirmed.
- Suppliers provide sample signed SPDX SBOMs; verification keys imported and rotated test completed.
- Environment integration points for admission webhook catalogued (dev/stage/prod) with change windows reserved.

## Definition of Done (DoD)

- Pull requests exceeding budgets are blocked with actionable diff output and remediation guidance.
- Releases without valid attestations fail admission with logged root cause and notification to release channel.
- Evidence bundle contains budget trend charts, blocked PR example, attestation logs, waiver ledger, and is signed + stored immutably for ≥3 years.
- Synthetic probes monitor `/sboms`, `/vulns`, `/waivers`, `/policy/decision`; alerts fire within 5 minutes of SLO burn.
- Runbooks published for ingestion failure, CVE feed outage, waiver escalation, and attestation troubleshooting.
- Security review signed off: token least-privilege audit, tamper-evident log verification, penetration test on waiver UI.
- “Merge clean” validation executed before cutover: branch protection checks green, policy engine regression suite passes, lint/format scans clean, infrastructure drift detection returns zero diff.

## Testing & Validation Strategy

- **Automated Testing:** Unit tests for collectors, aggregators, and policy engine (budgets, waiver expiry, attestation parsing) executed per commit in CI.
- **Integration Testing:** Nightly pipeline runs ingest golden SBOMs, inject synthetic CVEs, and verify budget enforcement plus waiver override scenarios.
- **Load & Resilience:** Pre-launch load tests simulate 5x p95 traffic on admission webhook; chaos drills cover feed outages, registry token revocation, and tamper-log write failures.
- **Security Testing:** Static analysis (SAST), dependency scanning, and targeted penetration testing on waiver UI and webhook endpoints.
- **Observability Verification:** Synthetic probes validate metrics, logs, and traces presence; dashboards audited for accurate SLO burn-down representations.

## Delivery Milestones

| Week | Focus                       | Key Outcomes                                                                                                                                                                             |
| ---- | --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | Stand up ingestion pipeline | Collector scaffolded, signed SPDX validation path proven, ADR PR opened (Security/SRE/Product Ops tagged), baseline dashboards + synthetic probes live, DoR artifacts linked.            |
| 2    | Vulnerability aggregation   | NVD/GHSA/vendor ingestion jobs operational, schema migrations complete, ingestion lag telemetry & alerting configured (<5m), waiver schema finalized.                                    |
| 3    | CVE budget policy           | Policy engine enforcing repo/env budgets, waiver API + UI MVP shipped, tamper-evident logging (hash chain) deployed, CI merge check integration demoed.                                  |
| 4    | Release gate                | Admission webhook gating deployments with attestation verification (p95 <200ms), least-privileged registry tokens validated, merge-block diff output refined.                            |
| 5    | UX & reporting              | Dashboards covering budgets, waivers, attestations; audit export signed; waiver expiry alerts (Slack/Email) active; false positive rate tuned <5%.                                       |
| 6    | Hardening & launch          | End-to-end drills with failure injection executed; synthetic probes expanded; evidence bundle + release notes finalized; production cutover with rollback & post-launch monitoring plan. |

## Operational Considerations

- **SLOs:** Ingestion lag <5 minutes; attestation gate p95 <200ms; false positive rate <5%; waiver processing SLA <2 business days.
- **Monitoring:** Prometheus metrics (`sbom_ingest_latency`, `cve_budget_utilization`, `attestation_gate_duration`, `waiver_expiring_total`), distributed tracing for policy decisions, structured logs with request IDs.
- **Alerting:** Pager rotation paged on SLO burn rate breaches; Slack digest summarizing waivers expiring in ≤7 days; audit export failures escalate to Compliance.
- **Runbooks:** On-call wiki houses playbooks, contact tree, rollback procedures, and manual override protocol (time-boxed, logged, requires VP approval).
- **Disaster Recovery:** Nightly backups of Postgres and tamper log digests; SBOM bucket versioning enabled; recovery drills scheduled in Week 6.
- **Quality Gates:** Every merge request must pass policy engine lint, unit/integration test suites, IaC drift detection, and documentation link validation to ensure a clean merge path.
- **Change Management:** All infrastructure changes routed through CAB-lite review; release train includes go/no-go checklist capturing SLO status, open risks, and evidence bundle readiness.
- **Training:** Conduct enablement sessions for developers and release managers on waiver workflow, interpreting policy failures, and attestation troubleshooting.

## Security Gates & Controls

- **Signed SBOMs:** Reject unsigned or stale SBOM submissions; rotate verification keys quarterly and audit signature verification logs.
- **Tamper-Evident Waiver Logs:** Hash-chained ledger replicated cross-region with daily digest notarization; weekly verification in compliance review.
- **Least-Privileged Tokens:** Registry and webhook tokens scoped per environment with automated secret rotation; alerts on unused or over-privileged credentials.
- **Admission Safeguards:** Break-glass path requires dual approver in PagerDuty + Slack with auto-expiry; manual overrides recorded in immutable log.
- **Data Protection:** Encrypt S3 buckets with KMS CMKs, enable server-side encryption for databases, and redact PII in logs by default.
- **Access Reviews:** Monthly recertification of waiver approvers, policy engine admins, and registry credential holders with SOC oversight.
- **Telemetry Integrity:** Sign and timestamp all metrics/log exports; detect tamper via hash verification job with alerting on mismatch.

## Track B Execution Plan

1. **Discovery (Weeks 1-2):** Instrument runtime telemetry collectors (eBPF agents, service mesh taps) to map package reachability; partner with observability team to define schema.
2. **Scoring Prototype (Weeks 3-4):** Combine exploitability signals (EPSS, KEV) with runtime coverage to derive composite risk score; expose via feature-flagged `/vulns?track_b=true` API.
3. **Pilot & Feedback (Weeks 5-6):** Run pilot on two services, compare false positive reduction vs. baseline, capture engineering feedback, and document backlog for general availability.
4. **Post-MVP Roadmap:** Prioritize integrations with runtime SCA tools, extend scoring to infrastructure CVEs, and evaluate ML-assisted prioritization.

## Policy & Waiver Workflow

1. Developer submits waiver via UI with justification, affected components, mitigation plan, requested expiry (≤30 days default).
2. Dual approval required: service owner + security lead; auto-escalate if pending >2 business days.
3. Upon approval, policy engine consumes waiver with scope (repo/env/package/severity) and enforces expiration.
4. Hash-chained audit log stores event; weekly compliance review exports ledger diff and verifies tamper hashes.
5. Expiring waivers trigger reminders at T-14, T-7, T-1 days; upon expiry, policy engine re-evaluates budgets immediately and blocks PRs/releases if violations persist.

## Attestation Enforcement Flow

1. CI pipeline signs images with cosign, produces in-toto provenance (SLSA level 2 baseline), and publishes SBOM to `/sboms` endpoint.
2. Admission webhook intercepts deployment request, fetches attestation, validates signature, builder ID, and supply chain materials.
3. Policy engine cross-references image digest with SBOM + CVE budget; if thresholds exceeded or attestation missing/stale, request denied.
4. Decision logged (append-only), metrics emitted, and notification sent to release and security channels with remediation guidance.
5. Successful deployments update attestation ledger and evidence bundle for traceability.

## Dashboards & Reporting

- **Budget Utilization Dashboard:** Severity heatmap per service/environment, trend lines, and waiver overlays.
- **Waiver Aging Dashboard:** Active waivers by age, upcoming expiries, approval latency metrics.
- **Attestation Health Dashboard:** Pass/fail rates, latency distribution, top failure causes.
- **Ingestion Reliability Dashboard:** SBOM ingestion lag, feed freshness, error rates.
- **Executive Summary:** Weekly PDF snapshot with KPIs, risk highlights, and blocked PR/release samples.
- **Real-Time Views:** Grafana annotations on deployment timeline call out waiver grants, budget breaches, and attestation overrides for rapid post-incident forensics.

## Risk & Mitigations

- **Noisy CVEs:** Integrate vendor advisories, maintain ignore lists reviewed weekly, leverage Track B exploitability scoring.
- **Feed Availability:** Cache last-known-good advisories; operate NVD mirror; fall back to GHSA when NVD lag exceeds 2 hours.
- **Policy Drift:** Store budgets/waivers as code with review gates, automated regression tests, and change history.
- **Waiver Abuse:** Enforce dual approvers, auto-expiry ≤30 days, quarterly audit of active waivers, and SOC rotation oversight.
- **Supply Chain Gaps:** Require provenance for all third-party images; block deployments missing attestations; track outstanding suppliers in risk register.
- **Scalability:** Autoscale policy engine and webhook pods; use feature flags for gradual rollout; load test to ensure <200ms p95 under peak.
- **Stakeholder Alignment Risk:** Weekly steering review with Security, Product Ops, and Compliance to unblock decisions; maintain RAID log with DRI assignments.
- **Data Quality:** Implement data validation pipelines, schema versioning, and reconciliation jobs comparing SBOM inputs to runtime inventory.

## Compliance & Evidence

- Weekly status attaches ADR link, dashboard screenshot, release notes, policy diff, and attestation sample logs.
- Evidence bundles (JSON + CSV + PDF) signed with organization key and stored in immutable bucket (WORM, 3-year retention).
- Quarterly control review checklist executed with Security, SRE, Compliance; findings tracked to closure.
- Audit export API provides regulators with download link and checksum; access gated by temporary signed URLs.
- Annual tabletop exercise validates regulator handoff packet freshness, evidence bundle reproducibility, and incident escalation pathways.
- Compliance automation scripts generate SOX/PCI mapping appendix, linking controls to policy engine checks and attestations.

## Kickoff Checklist

- [ ] Confirm DoR artifacts are created, reviewed, and linked in the program tracker.
- [ ] Open ADR PR and tag Security, SRE, and Product Ops stakeholders for visibility.
- [ ] Create baseline dashboards and publish SLO definitions on day 1.
- [ ] Stand up synthetic probes for `/sboms`, `/vulns`, `/waivers`, and `/policy/decision` before first deploy.
- [ ] Validate registry access, signing keys, and attestation verification credentials in lower environments.
- [ ] Run “merge clean” dry-run using golden branch to confirm policy engine, lint, tests, and IaC pipelines all succeed concurrently.
- [ ] Confirm access reviews and tamper-log verification jobs are scheduled with owners acknowledged.

## Next Steps Checklist

- [ ] Merge ADR PR after stakeholder approval and broadcast readiness in weekly status update.
- [ ] Establish runtime reachability telemetry for Track B scoring feed.
- [ ] Validate SLO alerts and synthetic probes pre-launch.
- [ ] Finalize runbooks and on-call rotation readiness review.
- [ ] Perform dry-run of evidence export and regulator handoff packet.
- [ ] Conduct end-to-end game day simulating blocked PR, waiver issuance, and release gate denial followed by successful deploy.
- [ ] Capture lessons learned and update backlog, Track B roadmap, and operating procedures prior to GA.
