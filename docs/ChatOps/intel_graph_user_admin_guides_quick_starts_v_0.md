# IntelGraph — User & Admin Guides + Quick Starts (v0.1)

> This guidebook distills how to use and administer IntelGraph: a secure, multi‑tenant intelligence graph platform with auditable provenance, compartmentation, automated tradecraft, and governance by design. It includes two full guides (User & Admin) and two quick starts you can hand to new teammates.

---

## Part I — User Guide (Analysts, Investigators, Intel/Cyber Teams)

### 1) What IntelGraph Is (and isn’t)

IntelGraph helps you ingest data, resolve entities, analyze geo‑temporal relationships, test hypotheses, and produce provenanced reports. Ethical guardrails and policy reasoning are built in. It **does not** support unlawful targeting or mass surveillance; attempts are blocked with human‑readable policy reasons.

### 2) Core Concepts

- **Entity / Relationship (ER) Model**: People, Orgs, Assets, Accounts, Locations, Events, Documents, Communications, Devices, Vehicles, Financial Instruments, Infrastructure, Claims, Indicators, Cases.
- **Provenance**: Every node/edge retains `source → assertion → transformation` lineage.
- **Policy Tags & Compartments**: Origin, sensitivity, clearance, legal basis, need‑to‑know; case spaces isolate work with 4‑eyes controls for high‑risk actions.
- **Tri‑Pane View**: Synchronized **Timeline + Map + Graph** with time‑brushing.

### 3) Everyday Navigation

- **Command Palette** (`⌘/Ctrl + K`): jump to cases, entities, connectors, or admin‑approved actions.
- **Global Filters**: Time range, geography (geofences, corridors), policy visibility.
- **Explain This View**: Inline help that explains which filters/queries generated the current view.

### 4) Getting Data In

**Paths to ingest**

1. **Ingest Wizard** → map CSV/JSON to canonical entities, classify PII, apply redaction presets, complete DPIA checklist.
2. **Streaming ETL** → attach sources (HTTP, cloud object stores, Kafka/Kinesis/AMQP, email, Git, RSS, STIX/TAXII, MISP, SIEM/XDR exports, DNS/WHOIS, NetFlow/IPFIX, sanctions lists). Add enrichers (GeoIP, language ID, OCR, NER, hashes, EXIF scrub, perceptual hashes for images).
3. **License‑Aware Intake** → attach data license/TOS to each source; disallowed sources are blocked at import, and license is enforced at export.

**Quality checks**

- Sample preview with schema suggestions and validation rules.
- Automated dedupe suggestions (pre‑ER), with confidence scores.

### 5) Entity Resolution (ER)

- **Pipeline**: deterministic joins → probabilistic matching → human review queue.
- **Explainability**: each merge shows contributing features, similarity score, overrides, and a reversible decision log.
- **Bitemporal truth**: track `validFrom/validTo` for facts; run snapshot‑at‑time queries.

### 6) Graph Analysis & Tradecraft

- **Link Analysis Canvas**: pivot, expand, pin, annotate; filter by time and geography.
- **Pathfinding**: shortest/cheapest paths; K‑paths; policy/territory/time‑constrained routes.
- **Community & Centrality**: Louvain/Leiden, betweenness, eigenvector with explainers.
- **Pattern Miner**: co‑travel/co‑presence, rendezvous, stay‑points, financial structuring motifs.
- **Anomaly & Risk Scoring**: pluggable detectors with a feature store; triage workflows.
- **Geo‑Temporal Analytics**: trajectories, convoys, rendezvous detection; map overlays for terrain, infrastructure, and external layers (ESRI/Mapbox).

### 7) Hypothesis & COA Workbench

- Create claims and competing hypotheses; attach evidence with weights.
- Update priors (Bayesian) as new evidence arrives; view costs of error.
- Plan Courses‑of‑Action (COAs): model dependencies, likelihood/impact, pre‑mortems.
- Run **what‑if simulations** (Monte Carlo) on graph transitions and propagation.

### 8) AI Copilot (Auditable by Design)

- Ask questions in natural language; preview the generated Cypher/SQL before executing in a sandbox.
- Retrieve answers from your case corpus with inline citations and snippet provenance.
- Schema‑aware assist for ingest mapping and dedupe candidate review.
- Guardrails: blocked actions show the policy reason and an appeal path.

### 9) Collaboration & Reporting

- **Case Spaces**: tasks, roles, watchlists, SLA timers; dual‑control gates for sensitive steps.
- **Comments & @mentions**: immutable audit/logging; legal hold capability.
- **Brief/Report Studio**: timelines, map boards, exhibits; one‑click PDF/HTML with redaction.
- **Disclosure Packager**: bundle exhibits with hashes and a provenance manifest.

### 10) Exporting & Interop

- Share indicators via **STIX/TAXII** and **MISP** (bi‑directional).
- Push context to SIEM/XDR (Splunk, Elastic, Chronicle, Sentinel).
- Create Jira/ServiceNow tickets or send briefs to Slack/Teams.
- Legal/E‑discovery: export to Relativity/Nuix with chain‑of‑custody manifests.

### 11) Ethics, Safety & “Won’t‑Build”

- The platform includes an explicit _Won’t‑Build_ list (e.g., mass repression, human‑subject abuse, covert exploitation). Attempted actions trigger policy‑by‑default denials with audit and escalation to ombudsman/ethics as configured.

### 12) Troubleshooting (User)

- Missing data? Check connector health in the case’s **Sources** panel.
- Can’t see an entity? Verify policy tags and your clearance/need‑to‑know.
- Merge seems wrong? Open the ER record → view features → request split/override.
- Export blocked? Open the **Policy Reasoner** panel for the denial rationale.

---

## Part II — Admin Guide (Platform Owners, SecOps, Data Gov, Compliance)

### A) Identity, Access, and Compartments

- **SSO**: Configure OIDC/JWKS with your IdP; enable step‑up auth for privileged actions; support WebAuthn/FIDO2 security keys.
- **Directory Sync**: SCIM for user/group provisioning.
- **Authorization**: ABAC/RBAC with externalized OPA policies. Model tenants, projects (case spaces), roles, attributes (origin, clearance, legal basis). Test changes in **Policy Simulation** before rollout.

### B) Data Governance & Licensing

- Create a **Data License Registry**: attach licenses/TOS to sources.
- Enforce license constraints at import/export; generate compliance proofs on disclosure bundles.
- Configure **K‑anonymity**/redaction presets; turn on minimization at ingest.

### C) Connectors, ETL & Schema Registry

- Register connectors (cloud buckets, brokers, feeds). Set schedules and backfills.
- Define transformations and enrichers; enable OCR/EXIF scrub where appropriate.
- Use **Schema Registry** to version canonical models; manage breaking changes with migration playbooks.

### D) Entity Resolution & Quality Controls

- Tune deterministic/probabilistic matchers; manage thresholds per entity type.
- Staff **Manual Reconcile Queues**; set SLAs and audit overrides.
- Enable temporal versioning; configure snapshot retention for historical queries.

### E) Security & Crypto

- **Key Management**: per‑tenant envelope encryption; enable field‑level crypto for sensitive attributes; optionally route sensitive compute to secure enclaves.
- Turn on anomaly alerts for unusual access; require reason‑for‑access prompts on sensitive views.
- Configure dual‑control for deletions; enable integrity suite (tamper alarms, cryptographic lockers) where required.

### F) Observability, Reliability & Cost

- Expose `/metrics` for Prometheus/OTEL; create SLO dashboards.
- Enable **Cost Guard** (query budgets, slow‑query killer, archived tiering to S3/Glacier).
- DR/BCP: PITR backups, cross‑region replicas; offline mode with CRDT merges; routine restore drills.

### G) Integrations

- CTI: STIX/TAXII and MISP.
- SOC/SIEM/XDR: Splunk/Elastic/Chronicle/Sentinel.
- Productivity: Slack/Teams bots; Jira/ServiceNow ticketing.
- GIS: Mapbox/ESRI layers and geofencing.
- Legal/E‑discovery: Relativity/Nuix adapters with chain‑of‑custody manifests.

### H) Admin Studio — Daily Ops

- Monitor connector health, job retries, and backfills.
- Manage policy tags, schema versions, and case‑space lifecycles.
- Review audit logs (who saw what, when, and why) and access anomalies.
- Run policy change dry‑runs against historical access patterns.

### I) Compliance & Ethics Operations

- Maintain the **Won’t‑Build** catalogue in governance docs.
- Configure ombudsman review queues for overbroad queries or blocked exports.
- Track acceptance criteria patterns (ER explainability, hypothesis rigor, provenance integrity).

### J) Go‑Live & Change Management

- Pre‑prod validation: identity flows, policy simulations, ER thresholds, connector backfills, DR restore test.
- Cutover checklist: freeze windows, rollback plan, comms, training materials.
- Post‑go‑live monitoring: SLOs, audit, cost guard, user feedback loop.

---

## Part III — Quick Starts

### Quick Start A — Analyst (60 Minutes to First Insight)

**Goal:** Ingest, resolve, analyze, and brief with citations.

1. **Sign In** via SSO → Confirm step‑up auth works (you’ll need it to export).
2. **Create Case Space** → add teammates and set 4‑eyes for exports.
3. **Ingest Data** → Ingest Wizard → map fields; enable OCR/NER; attach data license.
4. **Run ER** → review auto‑merges; resolve conflicts in the manual queue.
5. **Explore** → open tri‑pane view; set time window; draw a geofence; expand neighbors.
6. **Analyze** → run Pathfinding and Community; save a pinboard and annotate.
7. **Hypothesize** → add competing hypotheses; attach weighted evidence.
8. **Ask the Copilot** → pose a question → review generated Cypher → execute in sandbox.
9. **Report** → open Brief Studio → add timeline + map boards → export PDF with redaction.
10. **Share** → @mention reviewers; track comments; bundle a disclosure pack if needed.

**If blocked by policy**: open the **Policy Reasoner** to see the rule, legal basis, and appeal path.

### Quick Start B — Admin (Day‑0/Day‑1)

**Goal:** Stand up a compliant tenant with working ingest, governance, and observability.

1. **SSO & MFA** → Configure OIDC/JWKS and WebAuthn; test step‑up auth.
2. **Provisioning** → Enable SCIM; map groups to roles and ABAC attributes.
3. **Policies** → Import baseline OPA policies; run **Policy Simulation** on sample access logs.
4. **Crypto** → Enable per‑tenant envelope keys and field‑level encryption for PII.
5. **Connectors** → Register one object store and one feed (e.g., TAXII or MISP); schedule backfills.
6. **Schema Registry** → Activate the canonical model; publish data contracts to teams.
7. **Observability** → Connect `/metrics` to Prometheus; set SLOs; enable Cost Guard.
8. **DR/BCP** → Configure PITR and cross‑region replica; perform a restore drill.
9. **Audit** → Turn on reason‑for‑access prompts; verify audit events stream.
10. **Ethics** → Load the Won’t‑Build list; configure dual‑control for deletions and export gates.

---

## Part IV — Reference

### A) Keyboard & UI Cheatsheet

- `⌘/Ctrl + K`: Command palette
- `F`: Filter panel (time, geo, policy)
- `G`: Graph canvas; `M`: Map panel; `T`: Timeline
- `E`: ER review queue; `R`: Report Studio

### B) Glossary (selected)

- **Case Space**: A compartmented workspace with its own roles, policies, and audit.
- **Policy Tag**: Metadata enforcing origin, sensitivity, clearance, legal basis, and need‑to‑know.
- **4‑Eyes Control**: Two‑person approval required to execute a sensitive action (e.g., export).
- **Disclosure Pack**: Export bundle of exhibits with cryptographic hashes and a provenance manifest.

### C) Acceptance Criteria Templates

- **ER Explainability**: Each merge decision shows features, similarity, overrides; reversible.
- **Hypothesis Rigor**: Reports list competing hypotheses, evidence weights, residual unknowns.
- **Policy‑by‑Default**: Blocked attempts show human‑readable reasons and appeal path.
- **Provenance Integrity**: Exports include a manifest with hashes of all exhibits and transforms.

### D) Hardening Checklist (Admin)

- [ ] SSO + WebAuthn enforced for privileged roles
- [ ] SCIM sync verified; orphan account check
- [ ] ABAC/RBAC policies simulation passed
- [ ] Field‑level encryption enabled for PII/regulated data
- [ ] Cost Guard thresholds tuned; archived tiering enabled
- [ ] DR restore test performed and documented
- [ ] Audit anomaly alerts configured; ombudsman queue active
- [ ] Won’t‑Build catalogue reviewed; dual‑control for deletions confirmed

---

**Changelog**

- v0.1 — Initial draft aligned to platform capabilities and governance model; ready for team review.
