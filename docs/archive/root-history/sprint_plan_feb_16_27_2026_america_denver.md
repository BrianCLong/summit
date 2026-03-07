# Sprint Plan — Feb 16–27, 2026 (America/Denver)

**Sprint Name:** "Enterprise Readiness: Compliance Packs + Residency + Identity Hardening"

**Sprint Goal:** Make Summit convincingly enterprise-deployable: compliance-ready starter artifacts, enforced data residency posture, hardened adapters, and mature identity/access workflows without regressing provenance or unit economics.

---

## Sprint Backlog (stories, AC, estimate)

1. **Compliance Pack v1 — SOC2/ISO/PCI-Lite Mapping** — _5 pts_
   Map SOC 2 TSC and ISO 27001 controls to OPA policies, receipts/provenance, access logs, SDLC artifacts, DR drills, and PCI-lite posture doc for hosted path.  
   **AC:** Mappings published as docs-as-code; references to evidence locations are actionable; starter PCI-lite posture doc checked in; links from Trust/Docs entrypoint.

2. **Evidence Collector Jobs — Signed Bundles** — _8 pts_
   Scheduled job packages access review snapshots, KMS key rotation pointers, policy/config change history, and Switchboard incident summaries into signed bundles.  
   **AC:** Cron + on-demand trigger; bundle manifest with signatures; receipts stored; retry/idempotent; export API documented.

3. **Compliance Posture Dashboard** — _5 pts_
   Dashboard surfaces privileged ops volume, policy denials, dual-control adherence, key rotation age, and retention/purge events.  
   **AC:** Tiles fed by existing telemetry; dual-control and purge signals visible; alert thresholds configurable; demo-ready view.

4. **Region Tags as Policy Inputs** — _5 pts_
   Tenant `region_tag` becomes first-class ABAC input; cross-region writes denied.  
   **AC:** Policy tests include allow/deny by region; receipts show decision context; regression suite updated.

5. **Storage Sharding Rules v0** — _3 pts_
   Partition object storage paths/buckets by region+tenant; document DB partition strategy.  
   **AC:** Prefixing rules implemented/configurable; runbook + diagrams committed; smoke test proves correct placement.

6. **Retention Classes & Purge Enforcement Hardening** — _5 pts_
   Automate purge schedules per tenant retention profile; sign purge manifests.  
   **AC:** Manifests signed and queryable/exportable; failure alerts; audit trail retained.

7. **SCIM Provisioning v1 (Create/Update/Deprovision)** — _5 pts_
   SCIM flows create/update/deprovision users/groups with group→ABAC/role mapping and receipts.  
   **AC:** Contract tests green; receipts stored; error handling for drift; dry-run toggle for tenants.

8. **Role Catalog v1 (Least-Privilege)** — _3 pts_
   Ship enterprise default roles: Tenant Admin, Security Admin, Auditor (read-only), Billing Admin, Operator, Developer.  
   **AC:** Catalog published; regression tests validate least-privilege; dual-control for privileged changes enforced.

9. **Access Review Export + Dual-Control Signoff (MVP)** — _5 pts_
   Quarterly access review export with users, roles, last activity, and privileged actions; signoff requires dual-control with rationale.  
   **AC:** Export downloadable; signoff receipts stored; rationale mandatory; audit log entries emitted.

10. **Notary Adapter Reliability (Retry + DLQ + Replay)** — _5 pts_
    Implement retry strategy, idempotency, DLQ, and replay tooling for receipts/evidence notarization; add contract tests.  
    **AC:** Retries bounded with backoff; idempotent keys; DLQ replay script; contract tests pass.

11. **Storage Adapter Resilience (Multipart + Checksums)** — _3 pts_
    Ensure multipart uploads, checksum validation, and consistent prefixing by tenant/region; add partial-outage runbook.  
    **AC:** Checksums enforced; partial outage runbook merged; synthetic probe covers multipart path.

12. **Identity Adapter Robustness (OIDC Claims + Skew)** — _3 pts_
    Normalize OIDC claims, enforce tenant-bound tokens, and handle clock skew; add incident runbook + synthetics.  
    **AC:** Claim normalization documented; skew tolerance tested; synthetics scheduled; runbook published.

_Total forecast: 55 pts (stretch accounted via buffer for dashboard polish + adapter synthetics)._
**Capacity:** ~55 pts.

---

## Definition of Done (DoD)

- Compliance pack docs versioned, linked from Trust/Docs entrypoint, and demo-ready.
- Evidence collector produces signed bundles via schedule and on-demand; receipts stored; export flow documented.
- Data residency policy tests include cross-region denial cases; storage prefixing validated per tenant/region.
- SCIM contract tests + integration tests green; role catalog enforced; dual-control receipts captured for privileged changes.
- Dashboards/alerts + runbooks updated for SCIM failures, residency violations, purge failures, notary/storage outages.
- Helm/Terraform values documented for residency, SCIM, and evidence jobs (no hardcoded secrets/defaults).

## Definition of Ready (DoR)

- Each story has explicit AC, dependencies, and rollback plan; policy/adapter changes have test matrices and sample payloads.
- Test data: tenants per region, SCIM fixtures (groups/roles), purge manifest samples, synthetic incidents for dashboard signals.
- Feature flags/rollouts defined per tenant/region; observability hooks pre-identified.

---

## Capacity & Calendar

- **Capacity:** ~55 pts (team + reliability guardrails).
- **Ceremonies:**
  - Sprint Planning: Mon Feb 16, 09:30–11:00
  - Daily Stand-up: 09:15–09:30
  - Mid-sprint Refinement: Thu Feb 19, 14:00–14:45
  - Sprint Review: Fri Feb 27, 10:00–11:00
  - Retro: Fri Feb 27, 11:15–12:00

---

## Environments, Flags, Data

- **Envs:** dev → stage (region-partitioned buckets/DB schemas) with canary + auto-rollback; residency policy gate enabled in stage.
- **Flags:** `compliancePackV1`, `evidenceCollectorJobs`, `complianceDashboard`, `regionTagPolicy`, `storageShardingV0`, `retentionPurgeHardening`, `scimProvisioningV1`, `roleCatalogV1`, `accessReviewMvp`, `notaryReliability`, `storageAdapterResilience`, `identityAdapterRobustness`.
- **Test Data:** Region-tagged tenants, SCIM payload fixtures (users/groups/roles), purge manifest samples, notary replay seeds, storage multipart fixtures, OIDC token variants (clock skew, missing claims).

---

## QA Plan

**Functional:**

- Control mappings link to evidence locations; PCI-lite doc accessible.
- Evidence collector: scheduled + on-demand bundles signed; manifests verifiable.
- Dashboard: privileged ops volume, denials, dual-control adherence, key rotation age, retention/purge signals.
- Region-tag policies enforce cross-region denial; receipts show decision inputs.
- Storage sharding + retention purge flows place/write/read in correct region; manifests signed.
- SCIM create/update/deprovision with group→role mapping; receipts stored; dry-run toggle.
- Role catalog + dual-control enforcement; access review export/signoff workflow.
- Notary retries/DLQ/replay and contract tests; storage adapter multipart + checksum; identity adapter claim normalization + skew tolerance with synthetics.

**E2E:** SCIM provision users/groups → assign roles → attempt cross-region write (denied with receipt) → run access review export + dual-control signoff → generate compliance evidence bundle (SBOM/SLSA, DR drill, purge manifests, key-rotation pointers) → view compliance posture dashboard.

**Non-functional:**

- Residency and adapter synthetics green; retry budgets respected; alerting for SCIM/residency/notary/storage failures.
- Coverage for new policy/tests ≥80%; SLO/error budget impact tracked.

---

## Risks & Mitigations

- **Residency enforcement false positives** → explicit allowlists for control-plane ops; shadow mode first with receipts.
- **Evidence bundle drift** → schema + signature validation in CI; replayable fixtures.
- **SCIM/provider variance** → claim normalization matrix + contract tests; dry-run flag per tenant.
- **Notary/storage retries amplifying load** → bounded backoff + DLQ; replay tooling with rate limits.
- **Dual-control friction** → clear copy + delegation rules; audit receipts easy to export.

---

## Reporting Artifacts (produce this sprint)

- Control mapping docs; PCI-lite posture doc; evidence bundle manifests with signatures; residency policy test report; SCIM + adapter contract test reports; dashboard snapshot; runbooks for SCIM failures, residency violations, purge failures, notary/storage outages.

---

## Demo Script (live)

1. Provision users/groups via **SCIM** → roles/attributes applied with receipts.
2. Attempt cross-region write → denied by policy; receipt shows region_tag decision.
3. Run **access review export** + dual-control signoff with rationale.
4. Generate **compliance evidence bundle** (SBOM/SLSA, DR drill, purge manifests, key-rotation pointers) and verify signature.
5. Show **compliance posture dashboard** + alerts for residency/SCIM/notary/storage signals.

---

## Jira-ready ticket matrix (copy/paste)

| ID      | Title                                            | Owner   | Est | Dependencies | Acceptance Criteria (summary)                                |
| ------- | ------------------------------------------------ | ------- | --: | ------------ | ------------------------------------------------------------ |
| CMP-201 | Compliance Pack v1 (SOC2/ISO/PCI-lite mapping)   | Docs+BE |   5 | —            | Docs-as-code mapping; PCI-lite posture doc; links live       |
| CMP-202 | Evidence Collector Jobs (signed bundles)         | BE      |   8 | CMP-201      | Cron + on-demand; signed manifests; receipts; export API     |
| CMP-203 | Compliance Posture Dashboard                     | FE+Data |   5 | CMP-201      | Tiles for privileged ops/denials/dual-control/keys/purge     |
| RES-211 | Region Tags as Policy Inputs                     | BE      |   5 | CMP-202      | ABAC tests pass; receipts show region_tag decisions          |
| RES-212 | Storage Sharding Rules v0                        | BE+Ops  |   3 | RES-211      | Region+tenant prefixing; doc + smoke test                    |
| RES-213 | Retention Classes & Purge Enforcement Hardening  | BE+Ops  |   5 | RES-212      | Signed purge manifests; alerts; audit trail                  |
| IDN-221 | SCIM Provisioning v1                             | BE      |   5 | RES-211      | Create/update/deprovision; mapping; receipts; contract tests |
| IDN-222 | Role Catalog v1 (least-privilege)                | BE+Sec  |   3 | IDN-221      | Catalog published; LP regression; dual-control enforced      |
| IDN-223 | Access Review Export + Dual-Control Signoff      | FE+BE   |   5 | IDN-222      | Export + rationale; receipts; audit entries                  |
| ADP-231 | Notary Adapter Reliability (retry+DLQ+replay)    | BE+Ops  |   5 | CMP-202      | Bounded retries; idempotent keys; DLQ+replay; contracts      |
| ADP-232 | Storage Adapter Resilience (multipart+checksums) | BE+Ops  |   3 | RES-212      | Checksums enforced; synthetics; outage runbook               |
| ADP-233 | Identity Adapter Robustness (OIDC claims+skew)   | BE+Ops  |   3 | IDN-221      | Claim normalization; skew tolerance; synthetics; runbook     |

---

## Outcome of this sprint

We ship an enterprise-ready posture: compliance packs and evidence automation, enforced data residency, hardened adapters, and mature identity/access workflows with dual-control and receipts—keeping provenance intact while meeting deployment expectations for regulated tenants.
