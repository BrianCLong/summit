# Disclosure Packager Delivery Plan

## Mission Charter

- **Objective:** Launch a user-facing Disclosure Packager that exports audit trails, software bills of materials (SBOMs), compliance attestations, signatures, and policy reports for a selected tenant and time window.
- **Visibility Target:** User-visible in 90 days with an MVP (v0) milestone delivered in 6 weeks.
- **Definition of Success:** Customers download a signed disclosure bundle with verifiable checksums while telemetry captures adoption, completion times, and error states.

## Scope & Deliverables

- **MVP Functional Scope:**
  - Tenant and timeframe picker with artifact selection UI.
  - Backend export pipeline that assembles audit events, SBOMs, signatures, and policy reports into a single bundle.
  - Signed ZIP output with manifest, checksum index, and detached Cosign signature.
  - Analytics hooks capturing request, completion, download, and failure signals.
- **Deliverables:**
  - React frontend packaged behind feature flag `disclosurePackager.ui`.
  - Node/Express API with async job orchestration and provenance persistence.
  - Cosign-based signing service plus key rotation runbooks.
  - User documentation, empty-state guides, and customer verification checklist.
- **Out-of-Scope (Track B):** Customer-managed encryption keys and regulator-specific bundles (captured in Forward Work below).


## Readiness (DoR) Evidence

| Item                                                                                   | Owner            | Evidence / Link                                                                         | Status      |
| -------------------------------------------------------------------------------------- | ---------------- | --------------------------------------------------------------------------------------- | ----------- |
| Artifact repository inventory (audit events, SBOM storage, signatures, policy reports) | Product Ops      | [Project Wiki → Evidence Sources](https://example.com/wiki/disclosure-packager#sources) | ✅ Complete |
| Event schema catalog with version commitments                                          | Data Engineering | [Schema Registry](https://example.com/schema/disclosure-packager)                       | ✅ Complete |
| UX wireframes reviewed with Product, Security, SRE                                     | Design           | [Figma: Disclosure Export Flow](https://example.com/figma/disclosure-packager)          | ✅ Approved |
| Async export ADR drafted and routed for feedback                                       | Architecture     | [ADR-104: Disclosure Export Job](https://example.com/adrs/adr-104)                      | ✅ Signed   |

_All DoR items are satisfied and linked above to unblock sprint planning._

## Definition of Done (DoD)

- [ ] Export workflow produces a signed ZIP bundle containing:
  - Bundle manifest JSON with artifact metadata and SHA-512 checksums.
  - Detached signature (Sigstore/Cosign) and checksum index.
- [ ] Observability dashboards display export duration, success rate, retry counts, and queue depth.
- [ ] Automated validation enforces tenant isolation, signature verification, and PII redaction in generated bundles.
- [ ] Runbook includes incident response for failed exports, oversized bundles, and missing artifacts with linked escalation paths.
- [ ] Customer documentation covers setup, permissions, and verification steps including CLI checksum validation.
- [ ] Release notes, user guide, demo recording, and adoption dashboard snapshots attached to launch artifact bundle.

## Kickoff Checklist (All Teams)

1. **DoR Artifact Confirmation** – Links above are posted in the program workspace, pinned in the kickoff agenda, and mirrored in the engineering runbook so every squad can reach source-of-truth evidence in <2 clicks.
2. **ADR Pull Request** – ADR-104 PR #882 is opened against `docs/adr/` with Security, SRE, and Product Ops tagged as reviewers; merge proof is captured via screenshot in the evidence folder once approvals land.
3. **Baseline Dashboards & SLOs** – Grafana boards `/Disclosure Packager/Exports` and `/Disclosure Packager/Errors` are live with:
   - p95 export latency < 2 minutes for 10k events (automatic alert at 90% threshold).
   - Export success rate ≥ 99% (per-tenant and global views) with anomaly detection notes documented in the SRE runbook.
   - Backlog depth and retry rate panels exported as PDFs for the kickoff packet.
4. **Synthetic Probes** – Checkly monitors hitting `/disclosures/export` async submission and `/jobs/{id}` status endpoints are active pre-first deploy with alert routing validated by an SRE on-call acknowledgement drill.
5. **Merge Hygiene** – Branch protection requires passing lint/tests and status checks (`npm test`, `npm run lint`, `npm run format`); pre-merge preview deploy automatically exercises smoke tests for `/disclosures/export` flows.
6. **Evidence Collection** – Weekly status emails include ADR link, dashboard screenshots, release notes, policy diff attachments, and living checklist updates maintained in Notion.
7. **Kickoff Playback** – Day-zero recording of the kickoff walkthrough is stored alongside slides to remove single-threaded context.

## Merge Clean Assurance

- **CI Gate Coverage:** `npm test`, `npm run lint`, `npm run format`, and contract tests for `/disclosures/export` execute on every PR; failures block merge.
- **Preview Deploy Verification:** Each PR spins up an ephemeral environment where synthetic probes and smoke tests rerun to ensure zero-regression confidence.
- **Checklist Sign-off:** Program Manager validates the Kickoff Checklist before toggling merge readiness in LaunchPad; checklist stored in `docs/releases/disclosure-packager-v0.md` history.
- **Evidence Snapshotting:** After each merge, updated Grafana panels and ADR diff summaries are archived to `evidence/disclosure-packager/` ensuring traceability for audit review.

## Architecture Snapshot

- **Frontend (React/Vite):** Tenant + timeframe selectors, artifact checklist, async job progress, empty-state guidance, and download UX.
- **Backend API (Node/Express):** `/disclosures/export` POST creates jobs persisted in PostgreSQL; worker consumes jobs, aggregates data from audit, SBOM, policy services, and writes manifest via streaming assembler.
- **Signer:** Cosign-based signing service supporting platform keys by default with interfaces for customer-managed KMS (Track B).
- **Storage:** Bundles streamed to object storage with per-tenant buckets and lifecycle rules; manifest + checksum recorded in Neo4j provenance graph.
- **Webhook:** Completion webhook posts manifest summary and download URL; retries with exponential backoff.
- **Telemetry:** OpenTelemetry spans for job stages; metrics exported to Prometheus powering Grafana SLOs.

## Interfaces & Contracts

| Interface                          | Direction | Description                                                                                      | Status Signals |
| ---------------------------------- | --------- | ------------------------------------------------------------------------------------------------ | -------------- |
| `POST /disclosures/export`         | Client → API | Accepts `{ tenantId, dateRange, artifacts[] }`; enqueues async job and returns `202` with job ID. | Queue depth, validation failures |
| `GET /jobs/{id}`                   | Client ↔ API | Polls job status (`pending`, `running`, `completed`, `failed`, `partial`) with progress metadata. | Completion latency, retry count |
| Webhook `disclosure.export.ready`  | Platform → Tenant | Posts manifest summary, checksum index, and download URL; retries with exponential backoff.       | Delivery latency, failure alerts |
| Bundle manifest JSON               | Worker → Storage | Captures artifact list, SHA-512 checksums, jurisdiction tags, and policy versions.               | Provenance graph updates |

All interfaces documented in API reference PR-88; schema validation automated via contract tests.


## MVP Delivery Timeline (6 Weeks)

| Week | Focus                                  | Key Outcomes                                                                                     |
| ---- | -------------------------------------- | ------------------------------------------------------------------------------------------------ |
| 1    | Backend job skeleton & manifest schema | Job model, queue worker scaffold, manifest schema draft, contract tests.                         |
| 2    | Data connectors & streaming assembler  | Integrations with audit/SBOM/policy services, streaming ZIP assembly with checksum writer.       |
| 3    | Signing & storage                      | Cosign signer integration, object storage upload, manifest persistence, error handling.          |
| 4    | Frontend UI & async UX                 | React UI for selections, job status polling, download handling, empty-state and warning banners. |
| 5    | Telemetry & SLO automation             | OTel spans, Prometheus metrics, Grafana dashboards, synthetic probes, webhook instrumentation.   |
| 6    | Hardening & DoD closure                | Pen tests, redaction validation, runbook completion, docs, enablement demo, go/no-go review.     |

## Role Assignments

- **Engineering:**
  - Backend Lead – Orchestrates job pipeline, integrations, and storage.
  - Frontend Lead – Owns UI, state management, and UX polish.
  - Infrastructure – Handles deployment, scaling rules, and secrets management.
- **Security:** Validates tenant isolation, key management, redaction policies.
- **SRE:** Establishes SLO monitors, alerting, and synthetic probes.
- **Product Ops:** Coordinates evidence collection, release notes, and stakeholder updates.
- **Compliance:** Confirms attestations align with regulatory templates.

## Operational Readiness (Day 1)

- Feature flags configured for gradual rollout (`disclosurePackager.ui`, `disclosurePackager.api`).
- Tenant isolation automated tests executed against staging with cross-tenant probes.
- Redaction policies defined and implemented in export pipeline with sample data sets.
- Incident playbook `RUNBOOK-Disclosure-Packager.md` published covering escalation tiers and recovery steps.
- On-call rotations updated to include Disclosure Packager alerts.

## Security Gates & Controls

- **Tenant Isolation:** Automated canary probes across tenants; failure blocks promotion.
- **Signature Verification:** CI pipeline verifies Cosign signatures on sample bundles before release.
- **PII Redaction:** Data loss prevention checks integrated into export worker; alerts route to Security on violation.
- **Access Control:** Role-based permissions enforced in API gateway; audit logs reviewed weekly.


## Risk Register

| Risk                                  | Owner        | Mitigation                                               | Status  |
| ------------------------------------- | ------------ | -------------------------------------------------------- | ------- |
| Large bundles causing timeouts        | Backend Lead | Streamed assembly, chunked uploads, 5 GB alert threshold | Active  |
| Missing artifacts degrading value     | Product Ops  | UI warnings, manifest annotations, webhook partial flags | Active  |
| Customer-managed key readiness        | Security     | Design extension interface, schedule Track B discovery   | Planned |
| Compliance drift across jurisdictions | Compliance   | Maintain regulator template catalog, quarterly reviews   | Planned |

## Telemetry & Analytics Plan

- Adoption events emitted on export creation, completion, failure, and download.
- Time-to-value calculated from job request to first successful download.
- Alerting thresholds: queue depth > 50 for 5 minutes, retry rate > 5%, p95 latency breach.
- Reports sent weekly to stakeholders with trend charts and SLA adherence.
- Qualitative feedback from customer advisory sessions logged in Productboard with tags `disclosure-packager` and `track-b` to feed backlog grooming.

## Dependencies & Assumptions

- Audit, SBOM, and policy services expose stable read APIs with ≥ 99.9% uptime commitments.
- Object storage bucket policies updated to support per-tenant encryption contexts.
- CI infrastructure includes bundle signing secrets scoped to Disclosure Packager pipelines.
- Customer identity service provides tenant scoping metadata required for authorization checks.


## Evidence & Reporting Cadence

- Weekly status update includes ADR link, Grafana screenshot, release notes, policy diff, and demo snippet once available.
- Launch readiness review packages dashboard exports, runbook link, user guide, and recording of demo.
- Post-launch monitoring for 2 weeks with adoption metrics and user feedback logs.
- Evidence locker (`evidence/disclosure-packager/`) includes checksum-verified bundles per release candidate for Security's spot audit.

### Evidence Matrix

| Evidence Item            | Source Location                                                     | Owner        | Cadence |
| ------------------------ | ------------------------------------------------------------------- | ------------ | ------- |
| ADR-104                  | `docs/adr/ADR-104-disclosure-export.md`                             | Architecture | Weekly  |
| Grafana Dashboards       | `/Disclosure Packager/Exports` and `/Disclosure Packager/Errors`    | SRE          | Weekly  |
| Release Notes            | `docs/releases/disclosure-packager-v0.md`                           | Product Ops  | Weekly  |
| Policy Diff Report       | `compliance/policy-diffs/disclosure-packager/`                      | Compliance   | Weekly  |
| Demo Recording & Script  | `docs/demos/disclosure-packager/`                                   | Product Ops  | Bi-weekly |
| Adoption Dashboard       | Looker dashboard `DP Adoption` (exported PDF in evidence folder)    | Analytics    | Weekly  |


## Track B – Forward Work

- Customer-managed key support design doc scheduled for Week 7 review.
- Regulator-specific disclosure templates (e.g., SOC 2, ISO 27001) captured in template registry with ownership assignments by Week 8.
- Template metadata stored alongside bundle manifests with jurisdiction tags to enable targeted regulator exports.
- Explore automation for regulator-specific bundle generation leveraging manifest metadata (spike planned for Week 9).
- Capture customer feedback post-MVP to prioritize Track B roadmap sequencing in Q3 planning cycle.
- Product Ops to pilot regulator pack previews with two lighthouse customers, capturing satisfaction scores and turnaround times for Track B grooming.

## Post-Launch Feedback & Continuous Improvement

- **Customer Advisory Reviews:** Bi-weekly sessions capture requested artifact additions, export usability feedback, and regulatory blockers; findings triaged in backlog refinement.
- **Operational Retrospective:** Week 7 retro focuses on incident response effectiveness, synthetic probe fidelity, and SLO adherence adjustments.
- **Telemetry Deep Dive:** Analytics team delivers a post-launch insights deck summarizing adoption funnels, time-to-value distribution, and export failure root causes.
- **Documentation Refresh:** User guide, runbooks, and troubleshooting matrix receive an update pass after first 10 customer exports to incorporate real-world learnings.

## Launch & Communications Plan

- **Stakeholder Briefings:**
  - Weekly steering sync with Product, Engineering, Security, and SRE to review SLO adherence, risk burndown, and dependency status.
  - Bi-weekly customer advisory touchpoint to validate export usability, clarity of checksums, and artifact completeness.
- **Release Communications:**
  - Draft launch announcement and FAQ by Week 4; final approval by Legal and Compliance before Week 6.
  - Internal enablement packet (demo script, feature overview, troubleshooting tips) distributed via Product Marketing.
- **Support Enablement:**
  - Troubleshooting matrix outlining common failure signatures, log locations, and escalation paths for Support.
  - Knowledge base article with export walkthrough, checksum verification guide, and webhook integration examples.

## Next Actions & Owners

| Action                                                                 | Owner            | Due Date | Status |
| ---------------------------------------------------------------------- | ---------------- | -------- | ------ |
| Kickoff review to confirm responsibilities and finalize sprint backlog | Program Manager  | Week 0   | ✅ Complete |
| Load-test queue worker for 10k event bundle scenarios                   | Backend Lead     | Week 1   | 🔄 In Progress |
| Configure Checkly synthetic probes with alert routing                  | SRE              | Week 1   | ✅ Complete |
| Draft empty-state content and review with UX & Legal                   | Frontend Lead    | Week 2   | 🔄 In Progress |
| Produce demo walkthrough for MVP readiness review                      | Product Ops      | Week 5   | ⏳ Planned |
| Schedule go/no-go checklist sign-off with executive stakeholders       | Program Manager  | Week 6   | ⏳ Planned |

## Cadence & Governance

1. Daily stand-up highlights export queue health, probe status, and open risks.
2. Weekly status package includes ADR link, dashboard screenshot, release notes, policy diff, and action register updates.
3. Bi-weekly risk review ensures mitigations remain on track; blockers escalated to steering committee within 24 hours.
4. Post-launch (Weeks 7–8) monitor adoption metrics and collect customer feedback for Track B backlog refinement.
