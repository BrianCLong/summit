# Provenance-First Campaign Atlas – Sprint 0→1 Plan

1. **Sprint Objective & Non-Goals (10 bullets max)**

- Ship a demoable "Provenance-First Campaign Atlas" that clusters suspected influence/disinfo campaigns with verifiable provenance and analyst workflows.
- Deliver end-to-end ingestion→normalization→entity/narrative extraction→graph linkage with provenance hashing and lineage capture.
- Provide explainable campaign clustering with confidence + rationale surfaced in UI/API.
- Stand up provenance ledger integrating Maestro Conductor (MC) orchestration and IntelGraph storage for evidence linkage.
- Implement analyst triage workflow (queue, case, annotations, approvals) with immutable audit trail and ABAC enforcement.
- Generate policy-native disclosure packs with DLP/redaction, residency enforcement, manifest + signatures.
- Ship counter-amplification UX patterns (summaries/minimal excerpts/safe previews) to avoid rebroadcasting harmful content.
- Instrument SLOs/telemetry and effectiveness metrics (triage time, precision/recall proxies, analyst agreement).
- Establish adversarial test harness in CI (poisoning/evasion/timing/language-shift) as gates.
- Non-goals: production-scale ingestion volume hardening; full UI polish; long-tail connector catalog; unsupervised ML without explainability.

2. **User Stories (3 personas)**

- Analyst: "As an Intel analyst, I want ingested content normalized into IntelGraph with provenance so I can cluster suspected campaigns, review rationale, annotate, and escalate cases for approval without amplifying harmful content."
- Supervisor/Approver: "As a supervisor, I need a policy-governed queue of cases with confidence, rationale, and audit trails to approve/deny disclosure packs and ensure exports respect residency and DLP rules."
- External Consumer of Disclosure Pack: "As an external partner/regulator, I need a signed disclosure pack with chain-of-custody, redactions, and citations so I can trust findings without accessing raw harmful content."

3. **System Design (C4-ish)**

- Components: Ingestion connectors (RSS/Twitter-equivalent API/Tipline), Normalization/ETL workers (MC tasks), Entity/Narrative extractor (rule-based + model with confidence), Provenance Ledger (hash/timestamp/signature + OPA decision logs), IntelGraph (graph DB for entities/relationships/narratives), Campaign Clustering service (explainable heuristics + model), Analyst Workflow service (cases, queue, annotations, approvals), Disclosure Pack Generator (packager + redaction + signer), Counter-Amplification UX (safe previews, summaries), Observability stack (Prometheus/Grafana, audit log bus), Policy Engine (OPA/ABAC), Object store for evidence artifacts.
- Data flows: lawful/consented source ingestion → SourceCapture created with hash + metadata → Normalization transforms recorded as TransformSteps with lineage to EvidenceItems → Entity/Narrative extraction emits Entities/Narratives → graph update events to IntelGraph → Campaign service clusters and emits Campaign nodes + rationale edges → Analyst workflow pulls suspected campaigns to triage queue → decisions/annotations stored with audit trail → approval triggers DisclosurePack generation with policy evaluation + redaction and signing → packs stored + manifest emitted.
- Trust boundaries: Ingestion connectors (external data) → MC-controlled ETL boundary; Policy engine and provenance ledger enforce decisions; Disclosure packs crossing org boundary require signatures/manifest; Analyst UI separated from storage via APIs; Object store access via signed URLs; OPA/ABAC at API gateway and services.
- Failure modes + graceful degradation: Ingestion connector failure → retry with backoff, quarantine source; Model extraction failure → fall back to rules/keyword/entity regex; Clustering unavailable → surface per-item triage with rationale and mark confidence low; Policy engine down → deny by default and queue; Provenance ledger write failure → halt downstream actions and alert; Disclosure generation failure → keep case open with error state; Audit bus lag → buffer with durable queue.

4. **Data Model (tables/collections + key fields)**

- EvidenceItem: `evidence_id (UUID)`, `hash_sha256`, `content_uri`, `mime_type`, `source_capture_id`, `created_at`, `ingested_at`, `lineage_transform_id`, `signer`, `policy_log_ref`.
- SourceCapture: `source_capture_id`, `source_type`, `source_uri`, `collected_at`, `collector_id`, `raw_hash`, `metadata (headers/user_agent/geo/timezone)`, `consent_record_ref`, `storage_uri`.
- TransformStep: `transform_id`, `input_ids[]`, `output_ids[]`, `operation` (normalize, redact, parse), `parameters`, `timestamp`, `worker_id`, `hash_before`, `hash_after`, `policy_log_ref`.
- Entity: `entity_id`, `type` (person/org/topic/asset/channel), `canonical_name`, `aliases[]`, `confidence`, `provenance_refs[]`, `created_at`, `updated_at`.
- Narrative: `narrative_id`, `title`, `summary`, `signals` (keywords, claims), `confidence`, `evidence_refs[]`, `provenance_refs[]`, `created_at`.
- Campaign: `campaign_id`, `label`, `confidence`, `rationale[]` (evidence links, coordination patterns, timing correlation, stylometry), `member_entities[]`, `member_narratives[]`, `channels[]`, `assets[]`, `cluster_version`, `created_at`, `updated_at`, `status` (suspected/confirmed/closed).
- Case: `case_id`, `campaign_id`, `status` (open/needs-approval/approved/rejected), `assignee`, `queue`, `created_at`, `updated_at`, `annotations[]`, `audit_log_ref`, `triage_timer_start`.
- Decision: `decision_id`, `case_id`, `actor`, `role`, `action` (approve/reject/request-changes), `timestamp`, `reason`, `policy_eval_refs[]`, `signature`.
- PolicyEval: `policy_eval_id`, `subject`, `resource`, `action`, `policy_version`, `decision` (allow/deny), `timestamp`, `opa_input_snapshot`, `opa_result`, `signature`, `audit_log_ref`.
- DisclosurePack: `pack_id`, `case_id`, `campaign_id`, `generated_at`, `generated_by`, `redaction_manifest`, `residency_region`, `policy_eval_ref`, `files[]`, `bundle_hash`, `signature`, `verification_instructions_uri`.

5. **APIs / Events (minimum viable set)**

- Ingestion events: `source.capture.created`, `evidence.normalized`, `transform.recorded`, `entity.extracted`, `narrative.extracted` (payload includes ids, hashes, timestamps, provenance pointers).
- Graph updates: `graph.entity.upserted`, `graph.relationship.created`, `campaign.clustered` (with rationale summary + confidence); consumed by IntelGraph and audit bus.
- Case workflow APIs: `POST /cases` (from campaign), `GET /cases/:id`, `POST /cases/:id/annotations`, `POST /cases/:id/decision` (OPA-evaluated), `GET /queue?status=...`.
- Disclosure generation API: `POST /cases/:id/disclosure` (triggers policy eval + redaction + signing), `GET /disclosures/:id` (returns manifest + signed bundle URL), `POST /packs/:id/verify` (returns verification report).
- Counter-amplification UX endpoints: `GET /evidence/:id/safe-preview` (summary + blurred thumbnail), `GET /campaigns/:id/rationale` (top linking evidence, uncertainty notes).

6. **Governance & Security**

- ABAC roles: `analyst`, `supervisor`, `auditor`, `external-consumer`; attributes include clearance level, region, project, duty-status. Access rules: analysts create/annotate cases; supervisors approve disclosures; auditors read-only with full provenance; external consumers only access finalized packs with redactions.
- OPA policies (examples): deny exports if residency mismatch between evidence region and requested pack region; require supervisor approval + dual control for high-severity campaigns; block access to raw content unless duty-status=active and clearance>=required; auto-redact PII patterns before export; default-deny on policy engine failure.
- DLP/redaction strategy: pattern + classifier-based PII detection; redaction TransformStep recorded; minimal necessary excerpts; hashed placeholders; maintain pointers to originals under stricter ABAC.
- Residency controls: storage by region buckets; OPA checks on region match; Maestro workflows route jobs to region-specific workers; manifests include region.
- Threat model (top 10): (1) Poisoned ingestion data → mitigate via source allowlist, hash + schema validation, anomaly scoring; (2) Model evasion/paraphrase → adversarial test suite, fallback rules; (3) Provenance ledger tampering → append-only store, signatures, cosign verification; (4) Unauthorized export → OPA ABAC, dual control, logging; (5) Policy bypass via misconfig → policy tests + dry-run gates; (6) DLP failure/PII leak → DLP scanners + redaction manifest + sampling audits; (7) Replay/forged events → signed events, nonce + timestamp validation; (8) Cross-region leakage → residency guard + encryption at rest per region; (9) UI counter-amplification failure → safe-preview only, no autoplay, rate-limited excerpts; (10) Insider misuse → audit trail, least privilege, periodic review.

7. **Observability & SLOs**

- SLOs: Ingestion pipeline availability 99.0%; Analyst workflow API P50<200ms/P95<800ms; Provenance ledger write latency P95<500ms; Disclosure generation completion within 2 minutes P95; Data freshness (ingest to graph) <5 minutes P95.
- Effectiveness metrics: median triage time per campaign; analyst agreement rate on campaign classification; precision/recall proxies via labeled eval set; false-positive rate of DLP redaction sampling; % of decisions with explicit rationale; reduction in harmful-content exposure (ratio of safe-preview vs raw views).
- Dashboards: ingestion throughput/failures, policy decision outcomes, provenance ledger write success, clustering confidence distribution, triage queue aging, disclosure generation success/latency, DLP redaction coverage, counter-amplification usage. Alerts on SLO breaches, ledger write errors, OPA failures (deny-by-default), disclosure failures, anomalous low-confidence spikes.

8. **Backlog (10-day plan)**

- Day 1: Architecture + ADR draft; set up repo scaffolding for ledger + workflow; owners: architect + backend. Acceptance: ADR approved; baseline schemas in docs; evidence: ADR and schema doc.
- Day 2: Ingestion + normalization pipeline stub via MC; create SourceCapture/EvidenceItem storage + hashing; owners: backend. Acceptance: ingest sample feed to object store with hashes + events; tests: unit for hashing + event emission.
- Day 3: TransformStep lineage recording + DLP redaction transform; owners: backend. Acceptance: transform events recorded, lineage queries; tests: lineage unit/integration with sample data.
- Day 4: Entity/Narrative extraction (rule-based + model with confidence) emitting graph updates; owners: data/ML + backend. Acceptance: extracted entities/narratives stored with confidence/rationale; tests: extraction unit tests with golden set.
- Day 5: Campaign clustering service with explainable rationale output; owners: data/ML. Acceptance: clusters generated on sample set with rationale list + confidence; tests: clustering regression + rationale presence.
- Day 6: Analyst workflow service (cases, queue, annotations, decisions) with audit trail + ABAC enforcement; owners: backend. Acceptance: create/annotate/decide flows pass; tests: API + policy checks.
- Day 7: Disclosure Pack Generator with policy eval (OPA), redaction manifest, signing; owners: backend + security. Acceptance: pack generated with manifest/signature; tests: policy unit, manifest validation, signature verify.
- Day 8: Counter-amplification UX endpoints (safe preview, summaries) + minimal UI; owners: frontend + backend. Acceptance: safe-preview endpoints return summaries/blurred thumbnails; tests: snapshot + access controls.
- Day 9: Observability wiring (metrics/logs/traces) + SLO dashboard; owners: SRE. Acceptance: metrics exported, dashboards created; tests: alert rule dry-run.
- Day 10: Adversarial resilience suite + disclosure pack verification doc + release notes; owners: QA/security. Acceptance: CI gating tests green; evidence: test reports, release notes, disclosure verification steps.

9. **Adversarial Resilience Suite**

- Poisoned payload with malformed schema; expect rejection + alert.
- Coordinate-timing attack (bursty posts within minute); expect detection of coordination evidence in rationale.
- Paraphrased narrative drift; expect narrative extraction to map to same narrative with lowered confidence but rationale shown.
- Language shift (same narrative different language); expect translation + mapping with uncertainty noted.
- Stylometry perturbation; expect clustering notes reduced confidence but link via assets/timing.
- Image repost with minor edits; expect perceptual hash match and provenance linkage.
- Video/audio repost with re-encoding; expect A/V hash match or fallback to manual review flag.
- Adversarial keyword stuffing to evade DLP; expect redaction coverage and alert on failure.
- Export request with residency mismatch; expect policy deny with log.
- Ledger tamper attempt (replay event); expect signature/nonce verification failure.
- CI gating: all adversarial tests must pass; block merge on any failure; baseline refreshed only via approved ADR.

10. **Disclosure Pack Spec**

- Contents: executive summary, campaign description, top linking evidence with hashed references, rationale + confidence, timeline/map snapshots, redaction manifest, policy eval log, chain-of-custody ledger excerpts, verification instructions, signatures.
- Manifests: machine-readable JSON listing files, hashes, provenance pointers, residency region, redaction actions, policy decisions, signer identity, tool versions.
- Redaction rules: strip/blur PII, minimize excerpts, no raw full-resolution unless ABAC allowed; include placeholders for redacted fields.
- Signatures: cosign/sigstore over bundle hash; include policy eval signature; timestamp authority.
- Verification steps: fetch manifest, verify signatures and hashes, confirm policy decisions and residency, reproducibility check via transform lineage.

11. **Risks / Kill Criteria / Rollback**

- Risks: policy gaps leading to leakage; model over-clustering causing false positives; performance bottlenecks; UI exposing harmful content; residency misrouting; incomplete provenance chain; governance non-compliance; connector instability.
- Kill/descopes: if adversarial tests fail repeatedly → freeze new ingestion, focus on fixes; if provenance ledger unreliable → halt exports; if residency controls not passing → block disclosure feature; scope cut UI polish before disabling policy gates.
- Rollback: infrastructure changes behind feature flags; data migrations with down scripts; disclosure generation can be disabled via OPA deny; revert to rule-based extraction if model regression; keep prior stable cluster version for rollback.

12. **Evidence Bundle Checklist (release artifacts)**

- ADRs covering architecture, policy decisions, and clustering rationale approach.
- SBOM for services + dependency vulnerability report.
- Provenance attestations for build + artifacts (hashes, signatures).
- Test reports (unit/integration/adversarial), coverage, and CI logs.
- Policy evaluation logs and DLP redaction audit samples.
- Audit snapshots of cases/decisions/disclosure packs with anonymized metadata.
- SLO dashboard export + alert configuration.
- Release notes and runbook updates (ops + incident handling).
- Disclosure pack verification instructions + sample manifest.
- Backup/rollback verification evidence.
