# Epic 10 — Advanced Connectors + Bidirectional Sync

**Outcome:** enterprise connectors + safe delta sync + controlled “push-back” writes.

1. **M365 connector (Exchange/SharePoint/Teams)**
   - Owner: Integrations
   - Deps: Auth framework + data model mapping
   - DoD: Read-only ingest works for each service; least-privilege scopes documented; audit logs for each call.

2. **Google Workspace connector (Gmail/Drive)**
   - Owner: Integrations
   - Deps: OAuth + token storage/rotation
   - DoD: Supports user OAuth + domain-wide delegation; delta sync; attachment ingest policy-gated.

3. **Slack/Discord connectors**
   - Owner: Integrations
   - Deps: Message/event schema + rate-limit handling
   - DoD: Threads/files/reactions ingested; PII policy rules applied; backfill + incremental modes.

4. **GitHub/GitLab connectors**
   - Owner: Integrations
   - Deps: Identity model + repo artifact schema
   - DoD: Issues/PRs/commits/users ingest; webhook optional; provenance retained for each artifact.

5. **SIEM connectors (Splunk/Elastic/Sentinel) + query templates**
   - Owner: Integrations + SecEng
   - Deps: Query runner + secret vault
   - DoD: Template library ships; queries run with least privilege; results mapped to canonical events.

6. **Push-back sync framework (write tags/annotations back)**
   - Owner: Platform
   - Deps: Policy engine + audit ledger
   - DoD: Only approved write targets; per-connector capability matrix; every write is auditable + reversible.

7. **Incremental delta sync + watermarking for every connector**
   - Owner: Data Eng
   - Deps: Connector SDK contract
   - DoD: Watermark stored per tenant/source; idempotent replays; no duplicates across restarts.

8. **Connector health scoring (auth expiry, lag, error rate, drift)**
   - Owner: SRE
   - Deps: Telemetry + error taxonomy
   - DoD: Health score surfaced in UI/API; alert thresholds; drill-down to root error classes.

9. **Tenant-specific field mapping profiles + presets**
   - Owner: Data Eng + UX
   - Deps: Schema registry + mapping UI
   - DoD: Profiles versioned; diffable; rollback supported; preset library for common sources.

10. **Secrets rotation workflow + alerting**

- Owner: Security + Platform
- Deps: Secret store integration
- DoD: Scheduled rotation; failure alerts; no downtime rotations; audit trail for rotations.

11. **Connector certification kit (conformance + performance targets)**

- Owner: QA
- Deps: SDK + golden datasets
- DoD: Automated test harness; minimum p95/throughput targets; published checklist for new connectors.

---

# Epic 11 — Watchlists + Alerting + Triage Automation

**Outcome:** meaningful alerts with low noise; fast triage; defensible explainability.

1. **Watchlist model (entities/patterns/geo/time/keywords/motifs)**
   - Owner: Product + Graph Eng
   - Deps: Canonical entities + graph motifs spec
   - DoD: Versioned watchlists; RBAC/ABAC enforced; supports time/geo constraints.

2. **Alert rules engine (threshold/anomaly/new link/reappearance)**
   - Owner: Platform
   - Deps: Metrics + event stream
   - DoD: Rule types implemented; deterministic evaluation; test fixtures for each rule.

3. **Dedupe + suppression (cooldowns/correlation)**
   - Owner: Platform
   - Deps: Alert IDs + fingerprinting
   - DoD: Duplicate rate reduced; suppression reasons logged; analyst can override with justification.

4. **Triage queue UI (severity/assignment/SLA/quick actions)**
   - Owner: UX/App
   - Deps: Alert API + auth
   - DoD: Queue filters; assignment; SLA timers; action history.

5. **Alert-to-case conversion + templated checklists**
   - Owner: Product Ops + App
   - Deps: Case model
   - DoD: One-click conversion; checklist templates; provenance links carried into case.

6. **Enrichment on alert fire (snapshot/paths/similar cases)**
   - Owner: AI/ML + Graph Eng
   - Deps: Similarity service + pathfinding
   - DoD: Snapshot attached; top paths generated within budget; similarity links explainable.

7. **Alert explainability pane (why fired, inputs, evidence anchors)**
   - Owner: App + AI/ML
   - Deps: Evidence anchors + rule engine traces
   - DoD: Shows rule evaluation steps; cites evidence; exportable reasoning.

8. **Multi-channel notifications (email/webhook/Slack) w/ policy gates**
   - Owner: Platform
   - Deps: Notification service + policy rules
   - DoD: Per-tenant routing; payload minimization; opt-in; delivery logs.

9. **Playbooks (semi-automated, human-in-loop)**
   - Owner: Product + Platform
   - Deps: Tooling API + permissions
   - DoD: Playbook runs produce auditable steps; requires approvals where needed; safe defaults.

10. **Metrics dashboard (MTTA/MTTR/false positives/top rules)**

- Owner: Analytics + UX
- Deps: Alert lifecycle instrumentation
- DoD: Dashboard ships; tenant filters; weekly report export.

11. **On-call runbooks + taxonomy standard**

- Owner: SRE + Product Ops
- Deps: Error taxonomy + alert classes
- DoD: Runbooks complete; escalation paths; taxonomy enforced in UI.

---

# Epic 12 — Temporal Graph + Event Sequencing (V2)

**Outcome:** event-first reasoning; sequence queries; performant time slicing.

1. Event-first ingest lane

- Owner: Data Eng + Graph Eng
- Deps: Ontology
- DoD: Events primary; participants linked; bitemporal fields supported.

2. Sequence query helpers (A→B within X, exclusions)

- Owner: Graph Eng
- Deps: Query layer
- DoD: API supports common patterns; tested on fixtures; UI examples.

3. Temporal joins (rolling windows/sessionization)

- Owner: Graph Eng
- Deps: Time indexes
- DoD: Window joins correct; configurable; perf within p95 target.

4. Before/after diff viewer (entity state changes)

- Owner: UX/App
- Deps: Bitemporal data
- DoD: Diff highlights fields/edges; cites evidence; exportable.

5. Time-bounded ER

- Owner: AI/ML + Graph Eng
- Deps: ER engine
- DoD: Merge/split respects time; adjudication UI supports period adjustments.

6. Evidence decay functions (configurable)

- Owner: AI/ML
- Deps: Scoring framework
- DoD: Decay profiles; explainable; can be disabled per case.

7. Timeline clustering (bursts/campaigns/phases)

- Owner: AI/ML
- Deps: Event store
- DoD: Clusters stable; parameters logged; analyst override.

8. Event attribution fields (actor/capability/intent/confidence) w provenance

- Owner: Product + Graph Eng
- Deps: Claim ledger
- DoD: Attribution is a claim; confidence required; provenance mandatory.

9. Recurring pattern detector (rhythms/signatures)

- Owner: AI/ML
- Deps: Temporal joins
- DoD: Detects repeat motifs; low false positives; explainability included.

10. Exportable “event chain” exhibits

- Owner: App
- Deps: Report studio
- DoD: Exhibit renders; includes citations; respects redactions.

11. High-cardinality time performance tuning

- Owner: SRE + Graph Eng
- Deps: Observability
- DoD: Index/materialization plan; benchmarks; regression gate.

---

# Epic 13 — Knowledge Ops: Data Quality, Stewardship, Governance at Scale

**Outcome:** measurable trust; stewardship workflows; lineage & retention you can defend.

1. DQ dimensions + scoring

- Owner: Data Gov
- DoD: Score formula defined; surfaced per dataset; documented.

2. Automated validations per entity type

- Owner: Data Eng
- DoD: Rule library; failures quarantined; exceptions tracked.

3. Drift anomaly detection (schema/volume/distribution)

- Owner: Platform + ML
- DoD: Alerts on drift; baseline learning; review workflow.

4. Stewardship console

- Owner: UX/App
- DoD: Issue list, owners, status; remediation tasks; audit.

5. Controlled vocab + synonyms + localization

- Owner: Product + Data Gov
- DoD: Managed vocab store; synonym versioning; locale switching.

6. Golden record locking + dispute workflow

- Owner: Graph Eng + Product
- DoD: Lock rules; dispute queue; reversible with audit.

7. Lineage graph views

- Owner: Platform
- DoD: Source→transform→claim→output visible; clickable evidence anchors.

8. Retention simulation + sign-off

- Owner: GRC
- DoD: “What would delete” preview; approvals; legal hold overrides.

9. Trust tiers (untrusted/verified/authoritative)

- Owner: Data Gov
- DoD: Tiering rules; affects UI/AI weighting; explained to analysts.

10. Governance playbook

- Owner: GRC + Docs
- DoD: Roles/cadences/escalations published; adopted in onboarding.

11. Quarterly governance audit checklist + evidence capture

- Owner: GRC
- DoD: Checklist plus evidence templates; stored immutably.

---

# Epic 14 — Counterintelligence: Deception/Poisoning/Integrity Defenses

**Outcome:** detect manipulation; quarantine; keep models and analysts honest.

1. Poison signals (dup bursts/near-dup media/implausible geo-time)

- Owner: SecEng + ML
- DoD: Signals computed; thresholds configurable; explainability.

2. Source reliability scoring

- Owner: ML
- DoD: Scoring features logged; analyst override; drift monitoring.

3. Content authenticity checks (basic heuristics)

- Owner: SecEng
- DoD: Flags manip indicators; never “certifies truth”; stored as claims.

4. Contradiction map UI

- Owner: UX/App
- DoD: Shows mutually exclusive claims; links evidence; supports notes.

5. Deception hypothesis templates

- Owner: Product
- DoD: Template library; prompts for disconfirming evidence; dissent support.

6. Quarantine + review pipeline

- Owner: Platform
- DoD: Suspicious batches isolated; approval gates; recovery path.

7. Integrity notes required for high-impact conclusions

- Owner: Product + GRC
- DoD: Enforced fields; audit; report includes notes when applicable.

8. Red-team harness for poisoning tests

- Owner: Security + QA
- DoD: Repeatable scenarios; CI safety gates; regression trend.

9. Model-side defenses (retrieval filtering/citation-only/adversarial tests)

- Owner: AI/ML
- DoD: Prompt-injection suite; blocked patterns; measurable improvement.

10. Integrity score on briefs

- Owner: AI/ML + Product
- DoD: Score components visible; cannot be gamed trivially; stored with brief.

11. Integrity dashboards

- Owner: Analytics + UX
- DoD: Shows attempts, blocks, approvals; per-tenant trends.

---

# Epic 15 — Simulation & Influence Propagation (Decision Support)

**Outcome:** scenario comparison with explicit assumptions, reproducibility, and caveats.

1. Define simulation primitives

- Owner: Product + ML
- DoD: Formal spec; maps to graph objects; documented.

2. Propagation models (contagion/threshold/weighted)

- Owner: ML
- DoD: Implemented + unit tested; parameter logging.

3. Intervention library (generic, defensive framing)

- Owner: Product
- DoD: Library available; no operational wrongdoing guidance; policy-reviewed.

4. Scenario workspace (assumptions/priors/constraints/logs)

- Owner: UX/App
- DoD: Immutable logs; reproducible run config; export.

5. Sensitivity analysis

- Owner: ML
- DoD: Identifies top drivers; visualization; stored outputs.

6. Monte Carlo with reproducible seeds + audit

- Owner: ML + Platform
- DoD: Seeded runs; job queue; results traceable.

7. COA comparison UI

- Owner: UX/App
- DoD: Side-by-side; uncertainty displayed; costs/risks editable.

8. Guardrails (prevent actionable wrongdoing)

- Owner: GRC + Security
- DoD: Policy checks; denials are explainable; audit events.

9. Simulation-to-report export

- Owner: App
- DoD: Includes inputs/assumptions/limits; citations; redaction safe.

10. Performance controls

- Owner: SRE
- DoD: Budgets, cancellation, quotas; predictable runtime.

11. Validation suite with synthetic ground truth

- Owner: QA + ML
- DoD: Benchmarks; fails builds on regressions.

---

# Epic 16 — Marketplace + Extensibility (SDK, Plugins, Templates)

**Outcome:** safe extensibility without supply-chain panic.

1. SDK for connectors/enrichers/analytics modules

- Owner: Platform
- DoD: Typed contracts; examples; versioning policy.

2. Plugin sandbox (scopes + limits)

- Owner: Security + Platform
- DoD: Resource quotas; network/file restrictions; explicit permissions.

3. Signing + verification

- Owner: Security
- DoD: Signed artifacts required; verification enforced at install.

4. Template gallery

- Owner: UX/App
- DoD: Browse/install; previews; version pinning.

5. Admin controls (allow/deny/version/audit)

- Owner: Platform
- DoD: Full control plane; immutable logs.

6. Plugin CI harness

- Owner: QA
- DoD: Lint/tests/perf/security scans; publish gate.

7. UI install/upgrade/rollback

- Owner: UX/App
- DoD: One-click rollback; safe migrations; health checks.

8. Plugin telemetry (health + usage)

- Owner: SRE
- DoD: Crash/error metrics; opt-in controls; per-tenant view.

9. Reference plugins

- Owner: Platform + ML
- DoD: At least 3: custom NER, scoring, exporter; production-quality.

10. Developer docs site

- Owner: Docs
- DoD: End-to-end tutorial; API references; troubleshooting.

11. Governance process for contributions

- Owner: GRC + Product
- DoD: Review criteria; security review; deprecation policy.

---

# Epic 17 — Multi-Org Collaboration + Controlled Sharing

**Outcome:** share intelligence without oversharing; reversible access; verifiable provenance.

1. Compartmented sharing (packs, expiry)

- Owner: Platform + Security
- DoD: Object-level selection; expiry enforced; audit.

2. Minimal disclosure export mode

- Owner: GRC + App
- DoD: Field minimization; policy-based; disclosure preview.

3. Cross-tenant federation (pseudonymous IDs)

- Owner: Platform
- DoD: Opt-in; mapping keys protected; collision handling.

4. Secure contact channels (audited messaging)

- Owner: App
- DoD: Encrypted; retention rules; export controls.

5. Shared watchlists + DP options where feasible

- Owner: ML + Product
- DoD: Aggregated sharing; privacy budget documented; clear limitations.

6. Partner trust profiles

- Owner: GRC
- DoD: Constraints enforced (retention, fields, use); visible in UI.

7. External sharing approvals (legal + security)

- Owner: GRC + Security
- DoD: Workflow with sign-off; recorded rationale; time-boxed approvals.

8. Watermarking + recipient tagging

- Owner: Platform
- DoD: Watermarks on exports; recipient metadata stored; tamper-evident.

9. Revocation mechanics

- Owner: Platform + Security
- DoD: Access termination logged; tokens revoked; downstream audit.

10. Interop formats (STIX/JSON-LD/signed manifests)

- Owner: Integrations
- DoD: Round-trip tests; signatures verify; schema documented.

11. Tabletop exercise end-to-end

- Owner: Product Ops
- DoD: Scenario report; gaps tracked; remediations assigned.

---

# Epic 18 — UX Excellence: Analyst Flow, Speed, Cognitive Load

**Outcome:** analysts move faster with fewer mistakes; measurable UX performance.

1. Task-based UX benchmark (top 10 workflows)

- Owner: UX Research
- DoD: Baseline metrics captured; pain map; prioritized backlog.

2. Universal command palette

- Owner: App
- DoD: Search + actions; permission-aware; keyboard-first.

3. Investigation trails (auto-captured; replay/share)

- Owner: App
- DoD: Steps recorded; shareable within compartment; exportable.

4. Bulk operations UI

- Owner: App
- DoD: Bulk tag/merge/redact/move; undo; audit reasons.

5. Smart defaults + validation

- Owner: App
- DoD: Fewer required fields where safe; clear errors; reduces rework.

6. Keyboard-first + accessibility (WCAG)

- Owner: UX/App
- DoD: Focus states; ARIA; audited against WCAG targets.

7. Focus mode for briefs (cited facts/unknowns/dissent)

- Owner: App + Product
- DoD: Only evidence-backed statements; dissent section; caveats enforced.

8. Large-graph rendering optimizations (LOD/progressive expansion)

- Owner: App + Graph Eng
- DoD: Smooth interaction at target node counts; no browser crashes.

9. Onboarding (guided tours + synthetic cases)

- Owner: Enablement
- DoD: New user completes guided scenario; measurable learning outcomes.

10. Personal productivity (saved filters/pins/reminders)

- Owner: App
- DoD: Cross-device persistence; permission safe; fast retrieval.

11. UX performance budgets enforced in CI

- Owner: SRE + App
- DoD: Budgets defined; automated checks; release blocked on regressions.
