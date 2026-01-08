# Sprint Plan — Aug 17–28, 2026 (America/Denver)

> **Theme:** “Remove the last blockers to signature” — enterprise deal closers across private networking, customer-controlled observability, pen-test readiness, security questionnaire acceleration, and onboarding evidence.
> **Window:** Mon Aug 17 → Fri Aug 28, 2026 (America/Denver)

---

## 1) Sprint Goal (SMART)

Ship the enterprise features that most often block procurement—private connectivity, customer-controlled telemetry export, pen-test readiness, rapid security questionnaire responses, and productized onboarding—so a deal-blocked enterprise can sign with confidence by **Aug 28, 2026**.

**Key outcomes**

- Private networking works end-to-end for at least one cloud pattern (AWS PrivateLink or VPC peering) with tenant isolation and public-ingress denial when enabled.
- Observability exports support PII redaction/hash/drop policies, emit receipts, and deliver a downloadable “Observability Config Evidence Bundle.”
- Pen-test readiness pack exists with hardened staging posture, documented scope/ROE, SBOM/SLSA, DR, network diagrams, and scan gates showing **0 critical vulns** pre-test.
- Security Answer Pack generator outputs customer-sendable PDF/Doc with evidence references and redaction levels in < 30 minutes.
- Productized onboarding checklist completes Day 0–7 steps and produces a signed onboarding evidence bundle plus readiness score.

---

## 2) Success Metrics & Verification

- **Private networking:** At least one tenant provisioned via PrivateLink or VPC peering; public ingress denied in private-only mode. _Verify:_ Connectivity test from tenant VPC + firewall logs; receipts include tenant/region/change metadata.
- **Observability exports:** Redaction policies enforce remove/hash/drop; DLQ+replay working; evidence bundle downloadable. _Verify:_ Export health dashboard, redaction tests, DLQ replay log, bundle checksum.
- **Pen-test readiness:** Hardened staging baseline applied; scope/ROE docs published; SBOM/SLSA and DR drill report attached; pre-test scan shows **0 criticals**. _Verify:_ Scan report, ROE doc, evidence pack.
- **Security Answer Pack:** Template generator completes in < 30 minutes with evidence links and redaction level noted. _Verify:_ Timer run, generated PDF/Doc, evidence reference list.
- **Onboarding:** Checklist steps (IdP, residency/retention/BYOK if purchased, private networking, observability sink, Trust Report export) completed; readiness score shown; onboarding evidence bundle signed. _Verify:_ Dashboard, signed bundle, receipts.

---

## 3) Scope (must-have vs stretch)

**Must-have (commit):**

- **Private Networking (A1–A3):** Ship one private connectivity option (Primary: AWS PrivateLink; fallback: VPC peering) with tenant-scoped endpoints, private-only mode, dual-control enable/disable, receipts, and add-on metering (endpoint-hours + data as needed).
- **Observability Exports (B1–B3):** OTel export adapter for traces/metrics/logs; PII redaction/hash/drop policies selectable per tenant; DLQ + replay + health metrics; receipts for config changes; “Observability Config Evidence Bundle” export; Switchboard UI to configure/test/view health.
- **Pen-test Readiness Pack (C1–C2):** Hardened staging baseline (debug minimized, rate limits/WAF, least-privilege service accounts); documented scope + rules of engagement; evidence bundle with SBOMs, SLSA, signatures, network/trust diagrams, DR drill, vulnerability scan with remediation receipts (critical=0).
- **Security Questionnaire Automation (D1–D2):** Security Answer Pack generator with template sections (Company Overview, Data Security, Access Controls, Encryption/Key Mgmt, SDLC, Incident Response, BCP/DR, Compliance) linking policies/receipts/evidence/dashboards; approval-gated export with evidence usage + redaction tracking; PDF/Doc output.
- **Enterprise Onboarding Pack (E1–E2):** Productized Day 0–7 checklist (IdP OIDC/SCIM, residency/retention/BYOK, private networking, observability sink, Trust Report export); onboarding readiness score dashboard; signed onboarding evidence bundle.

**Stretch:**

- **Private-only enforced mode toggles via policy with staged rollout per tenant segment and rollback switch.**
- **Automated evidence bundle diffing** (changes between exports highlighted for auditors).

---

## 4) Team & Capacity

- Capacity: **~42–45 pts** (stretch optional).
- Ceremonies (America/Denver):
  - **Sprint Planning:** Mon Aug 17, 09:30–11:00
  - **Stand-up:** Daily 09:15–09:30
  - **Mid-sprint Refinement:** Thu Aug 21, 14:00–14:45
  - **Sprint Review:** Fri Aug 28, 10:00–11:00
  - **Retro:** Fri Aug 28, 11:15–12:00

---

## 5) Backlog (Ready for Sprint)

| ID        | Title                                                    | Owner    | Est | Dependencies | Acceptance Criteria (summary)                                |
| --------- | -------------------------------------------------------- | -------- | --: | ------------ | ------------------------------------------------------------ |
| NET-301   | PrivateLink / VPC Peering (tenant-scoped + private-only) | Infra    |   8 | AWS accounts | Private endpoint or peering works; private-only denies pub.  |
| NET-311   | Dual-Control + Receipts + Metering for Networking        | Platform |   4 | NET-301      | Dual-approval toggle; receipts; billing line items.          |
| OBS-321   | OTel Export Adapter + Redaction Policies                 | BE       |   6 | —            | Export to customer sink; remove/hash/drop rules enforceable. |
| OBS-331   | DLQ + Replay + Health + Evidence Bundle                  | BE+Ops   |   4 | OBS-321      | DLQ/replay; health metrics; bundle downloadable.             |
| UI-341    | Switchboard UI for Observability Sinks                   | FE       |   4 | OBS-321      | Configure/test sinks; view status; receipts surfaced.        |
| SEC-351   | Pen-test Mode Hardening (staging)                        | Ops+Sec  |   5 | —            | Debug off; rate limits/WAF; least-privilege SAs.             |
| SEC-361   | Pen-test Evidence Pack (SBOM/SLSA/DR/diagrams/scans)     | Sec+Docs |   4 | SEC-351      | Bundle published; 0 critical vulns in gate.                  |
| QA-371    | Security Answer Pack Generator + Approvals               | BE+Docs  |   5 | —            | Template populated <30m; evidence links + redaction noted.   |
| ONB-381   | Day 0–7 Onboarding Checklist + Readiness Score           | FE+BE    |   5 | —            | Checklist complete; readiness dashboard; signed bundle.      |
| STRETCH-1 | Private-only staged rollout + rollback switch            | Infra    |   3 | NET-301      | Toggle per segment; safe rollback.                           |
| STRETCH-2 | Evidence Bundle Diffing                                  | Platform |   3 | OBS-331      | Diffs between bundles available.                             |

> **Planned:** 45–47 pts including optional stretch.

---

## 6) Dependencies & Assumptions

- AWS accounts and target VPCs available for PrivateLink/peering tests; tenant VPC CIDRs provided.
- OTel-compatible customer endpoints or collectors reachable; redaction policy definitions approved by privacy/legal.
- Pen-test partner slot scheduled; staging environment parity with prod minus real data; WAF/rate-limit controls configurable.
- Evidence sources ready: SBOM generator, SLSA attestations, DR drill report, Trust Report export, policy repository.
- Approval workflows available for networking changes and external exports.

---

## 7) QA Plan

**Functional:**

- Provision tenant PrivateLink/peering; assert traffic allowed privately and blocked publicly in private-only mode; verify receipts and metering entries.
- Configure OTel sinks with remove/hash/drop policies; simulate PII and validate redaction; induce failures to fill DLQ and replay; download evidence bundle.
- Enable pen-test mode and run smoke + vulnerability scan gates; confirm 0 criticals; verify WAF/rate limits and least-privilege service accounts.
- Generate Security Answer Pack under timer; ensure all sections populated with evidence references and redaction levels; approval gate enforced for external export.
- Complete onboarding checklist across sample enterprise tenant; generate readiness score and signed onboarding evidence bundle.

**E2E:** Enterprise tenant enables private-only mode → connects via PrivateLink → configures OTel sink with redaction → exports telemetry and views receipts → generates Security Answer Pack → completes onboarding checklist and Trust Report export.

**Non-functional:**

- Networking performance within acceptable latency for PrivateLink/peering; observability export throughput monitored; DLQ replay does not cause SLO regressions.

---

## 8) Risks & Mitigations

- **Private connectivity rollout risk** → Start with single-region pilot, staged rollout flag, clear rollback to public+private; rehearse DNS/endpoint cutover.
- **Redaction gaps or PII leakage** → Unit tests for policy rules; sample payload fuzzing; approvals required before external export; DLQ monitoring.
- **Pen-test blocking findings** → Run pre-scan daily; auto-create tickets; enforce remediation SLAs; gate on zero criticals.
- **Questionnaire generator drift** → Template versioning; evidence snapshot timestamps; dry-run timer to ensure <30 minutes.
- **Onboarding variance by tenant** → Checklist templating per SKU; readiness score weights agreed with CS/Sales; evidence bundle signatures validated.

---

## 9) Reporting Artifacts (produce this sprint)

- Private networking change receipts and connectivity test logs; metering report for add-on line items.
- Observability export health dashboard, DLQ/replay report, redaction test results, Observability Config Evidence Bundle.
- Pen-test readiness evidence pack (SBOMs, SLSA, network/trust diagrams, DR drill, vulnerability scan, remediation receipts).
- Security Answer Pack (PDF/Doc) with evidence references and redaction levels; approval log.
- Onboarding readiness dashboard snapshot; signed onboarding evidence bundle; Day 0–7 completion log.
- Burndown/throughput charts for sprint review.

---

## 10) Demo Script (review)

1. Enable **private-only mode** and show public access denial; connect via PrivateLink/VPC peering from tenant VPC; show receipts and metering.
2. Configure **OTel sink** with redaction; send sample payload; show redacted export, DLQ/replay path, and health dashboard.
3. Generate **Security Answer Pack**; show <30-minute timer, evidence links, and redaction levels; approval gate.
4. Run **onboarding checklist** steps (IdP, residency/retention/BYOK, private networking, observability sink, Trust Report export); show readiness score and signed evidence bundle.
5. Present **pen-test readiness pack** with hardened staging posture and 0 critical findings from gate.

---

## 11) Outcome of this sprint

Enterprise-blocking gaps are closed: customers can connect privately, export telemetry safely with receipts, share a vetted Security Answer Pack quickly, enter pen-test with zero criticals, and complete Day 0–7 onboarding with signed evidence—clearing the path to signature.
