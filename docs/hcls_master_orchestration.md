# IntelGraph HCLS Master Orchestration Plan (v13)

This document captures the execution blueprint for the Healthcare & Life Sciences (HCLS) variant of the IntelGraph program. It aligns delivery with HIPAA/HITECH, HITRUST, 21 CFR Part 11, ONC/Cures, GDPR, and local health-privacy requirements while upholding IntelGraph performance, availability, cost, and safety guardrails.

## Governance & Safety Posture
- **Authorities:** Meta-Governance Framework, Agent Mandates, and Living Rulebook remain the governing sources. All work follows OIDC/JWT, OPA/ABAC, mTLS, field-level encryption, and immutable provenance defaults.
- **Clinical Safety:** CDS surfaces are assistive-only with mandatory disclaimers, human-in-the-loop review, and override logging. Part 11 validation and audit trails are required for all GxP-impacting changes.
- **Retention & Residency:** Standard 365-day retention with 30-day PHI minimization unless superseded by legal/clinical retention. Regional residency gates are enforced on ingest and export.

## SLOs, Cost, and Observability
- **API SLOs:** Read p95 ≤ 350 ms; write p95 ≤ 700 ms; subscriptions ≤ 250 ms. Graph 1-hop ≤ 300 ms, 2–3 hop ≤ 1,200 ms. Ingest p95 ≤ 100 ms at ≥1,000 ev/s per pod.
- **Availability/Cost:** 99.9% monthly availability, 0.1% error budget. Unit costs capped at $0.10/1k ingested events and $2/1M GraphQL calls (80% alerting threshold).
- **Observability:** OTel spans with PHI redaction, Prometheus metrics, Grafana boards for p95/99, cost burn, and clinical safety monitors. Evidence bundles include KPIs, hashes, and rollback references.

## Execution Constructs
- **Epics in Parallel:** Eleven epics run concurrently with RACI: MC=Approver; owners per task remain accountable. Each task emits an artifact, verification + SLO evidence, provenance manifest, and rollback/backout plan.
- **Change Control:** Deny-by-default ABAC with consent/purpose checks for TPO/Research/Marketing. Break-glass requires time-boxing and alerting. All changes documented in immutable audit chain.
- **Data Controls:** Quarantine + payload scanning on ingest, consent attachment, residency gates, and minimum-necessary enforcement. De-identification follows HIPAA Safe Harbor/Limited Data Set with expert determination workflow for edge cases.

## Epic Execution Snapshot (Sprint 0)
| Epic | Objective | Sprint 0 Status | Immediate Actions |
| --- | --- | --- | --- |
| 1: Regulatory & Compliance Foundation | Establish HIPAA/HITRUST/Part 11 baselines with consent, DPIA, and continuous monitoring | 🟡 10% (scoping) | Finalize system boundary & PHI data flows; draft HIPAA safeguards map; prep Part 11 validation checklist; set cadence for continuous monitoring KPIs |
| 2: Interoperability & Ingest | Secure HL7 v2, FHIR, DICOM, claims, device feeds with quarantine and DLQ | 🟡 8% (adapters in review) | Validate HL7 v2 adapters against golden fixtures; wire FHIR $export/$import smoke tests; enforce residency gatekeeper; configure DLQ/replay with deterministic reprocessing |
| 3: Canonical Model & Terminologies | Unified clinical/payer entities with terminology services and provenance | 🟡 6% (model drafting) | Lock entity/edge list; enable terminology service hit-rate monitors; define provenance fields and consent labels; script idempotent constraints |
| 4: PHI De-Identification & Privacy Engineering | k-anonymity/l-diversity/t-closeness with DP layer and tokenization | 🟡 7% (policy drafting) | Publish de-ID policy; catalog quasi-identifiers; validate generalization rules; benchmark tokenization/FFX performance with audit hooks |
| 5: EHR Integration & FHIR/SMART APIs | Low-latency SMART on FHIR with ABAC and persisted queries | 🟡 9% (auth flow setup) | Produce capability statement; exercise SMART OAuth2/PKCE flow; enforce persisted query allowlist + cost guards; document write-back patterns |
| 6: Imaging & Omics Pipelines | DICOM/genomics ingestion with de-ID and provenance | 🟡 5% (pipeline scaffolds) | Stand up DICOM listener with p95 telemetry; enable WADO-RS viewer integration test; checksum validation for genomics ingest; cost-aware storage tiering plan |
| 7: Clinical Analytics & CDS | Explainable, assistive CDS with safety rails and audit evidence | 🟡 6% (governance setup) | Define HEDIS/outcome measures; register feature store with provenance; draft model governance (validation/monitoring); implement bias/drift monitors and safety disclaimers |
| 8: Research, RWE & Trial Ops | Research mode with IRB/eConsent and GxP validation | 🟡 5% (segmentation design) | Specify research tenant isolation; link eConsent to protocol IDs; seed cohort builder fixtures; prepare Part 11 IQ/OQ/PQ plan |
| 9: Security & Zero-Trust | Defense-in-depth with FLE, break-glass, DLP, and isolation | 🟡 8% (control tailoring) | Document ICAM/WebAuthn pathways; map FLE selectors; define break-glass logging; schedule quarterly access review workflow |
| 10: Observability & Patient-Safety Signals | OTel, SLO dashboards, safety probes, and FinOps | 🟡 9% (dashboard wiring) | Publish SLO dashboards; configure synthetic probes (FHIR/HL7/DICOM); activate clinical safety monitors; enable FinOps alerts at 80% spend | 
| 11: Release, Enablement & Customer Readiness | Cadence, compliance pack, demos, and training | 🟡 6% (release runway) | Finalize release cadence; script post-deploy validation; assemble compliance pack; prepare clinician-friendly demos and training assets |

## Verification & Evidence Expectations
- **Testing:** Unit/integration/property/perf tests per service with ≥80% coverage for changed code. Golden ingest and golden graph fixtures used for regression. CDS hooks capped at ≤250 ms end-to-end.
- **Validation:** Part 11 audit trails, hash-anchored evidence bundles, and automated PR quality gates. SLO burn tracked with alert thresholds and backoff guidance.
- **Rollback/Backout:** Each epic maintains tested backout runbooks; ingest kill-switches and dataset revocation paths are mandatory. Releases follow freeze/freeze-lift protocols with safety-first halt triggers.

## Innovation Track
- **Adaptive Cost & Safety Guard:** Introduce a policy-driven “cost-and-safety arbiter” that combines persisted query cost models, ABAC consent context, and live SLO telemetry to pre-emptively throttle or reroute workloads (e.g., shift heavy FHIR bulk exports to off-peak with DP noise budgets while preserving p95 targets). Pilot within API gateway and ingest pathways with immutable audit spans.

## Reporting Cadence
- Sprint-level updates include per-epic % progress, compliance/safety blockers, SLO burn, evidence links, and backout readiness. Results are published to the provenance ledger and mirrored to the evidence binder.
