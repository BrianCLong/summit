# Regional Expansion Readiness Matrix

This playbook operationalizes regional expansion without bespoke one-offs. It pairs policy, technical controls, and operational guardrails across nine epics. The starter matrix below tracks three launch targets (United States, European Union focus on Germany, and Singapore) and can be extended per region.

## 1) Go / Hold / No-Go Criteria by Region

| Region                   | Go                                                                                                                        | Hold                                                                                                 | No-Go                                                                                                |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| United States            | SOC2 + ISO27001 active, data residency optional, export screening live.                                                   | Pending state-level privacy addenda (e.g., CCPA updates), partial subprocessor coverage.             | No screening or acceptable-use controls; unresolved law-enforcement data handling.                   |
| European Union (Germany) | GDPR Article 28 DPA + SCCs in place, EU data stored in-region with KMS per-region, Schrems II transfer assessment logged. | Residency controls live but egress allowlists incomplete; union works council consultations pending. | No legal basis for processing; cross-region “helper” services still active; missing DSAR automation. |
| Singapore                | PDPA-compliant notices, SG KMS keys, MAS TRM alignment for financial vertical.                                            | MAS addenda in negotiation; regional backups unverified; partner screening lagging.                  | Data exits SG region without allowlist; missing financial-sector clauses for regulated customers.    |

## 2) Regulatory Requirements Matrix

| Domain   | US                                      | EU (DE)                                   | SG                               | Control / Process (Owner)                                                        |
| -------- | --------------------------------------- | ----------------------------------------- | -------------------------------- | -------------------------------------------------------------------------------- |
| Privacy  | State privacy (CCPA/CPRA)               | GDPR (DPA, SCCs, RoPA, DPIA)              | PDPA                             | Policy engine enforcing residency (Platform Eng), Records of Processing (Legal). |
| Consumer | FTC unfair/deceptive                    | EU consumer protection                    | PDPA consent/withdrawal          | Consent + notice services (Product), audit logging (Security).                   |
| Sector   | CJIS/FIN optional                       | NIS2/finance riders                       | MAS TRM for finance              | Sector feature flags + riders (Legal), regulated feature gating (Platform).      |
| Labor    | Support staff monitoring/works councils | Works council consultation for monitoring | Employee monitoring notification | HR process for monitoring approvals (HR), access justifications (Security).      |
| Tax      | Nexus + sales tax                       | VAT + invoice formats                     | GST                              | Regional invoicing templates (Finance), tax engine config (RevOps).              |

## 3) Requirement → Control Mapping

- **Residency enforcement:** Tenant home region, policy engine default-deny cross-region, regional KMS keys, backups and restores validated in-region (Platform Eng).
- **Export controls & sanctions:** Onboarding screening + re-screen cadence, geo/IP risk scoring, restricted-party escalation, stop-service playbook (Legal + Security).
- **Procurement:** Standard packets (security/privacy/reliability), regional DPAs/SCCs, uptime/support SLAs aligned to real ops, contract metadata tracked (Legal/RevOps).
- **Localization:** i18n pipeline, locale formats, time zone correctness, country feature flags for regulatory differences, glossary and fallback behaviors (Product/Eng).
- **Reliability & performance:** RUM by region, CDN/edge caching, regional caches, load tests and SLO dashboards per region, dependency availability plans (SRE).
- **Operations & support:** Follow-the-sun coverage, routing by region/language/severity, region-aware comms, runbooks with regional addenda, proactive alerts (Support/SRE).

## 4) "What We Will Not Do"

- No bespoke forks or country-only code branches; everything behind configuration/feature flags.
- No ungoverned cross-region “helper” services or shared caches.
- No promises of residency or SLAs without validated controls (“controls proven, not promised”).
- No bespoke partner builds; partners must use standard platform primitives.

## 5) Localization Checklist

- Language coverage: EN, DE, FR, ES, JA, ZH-SG; glossary maintained.
- Locale formatting: dates, numbers, currency, address formats.
- Time zone correctness: storage → API → UI → exports.
- Templates: onboarding, email, invoice, legal notices localized.
- Fallback behavior: never broken UI; missing strings fall back to English with telemetry.

## 6) Procurement Checklist (per region)

- Security/privacy packet, uptime/support commitments, reliability architecture.
- DPAs/SCCs and data transfer addenda; sector riders where required.
- Tax/VAT/GST invoicing readiness; evidence of filings as applicable.
- Standard artifacts: pen test letter, vuln management cadence, business continuity/DR, evidence pack.
- Fast lane vs slow lane criteria (regulated vs standard deals) with documented SLAs for legal/security review.

## 7) Subprocessor Availability Map

- Maintain inventory of subprocessors with approved regions and data classes handled.
- Block usage in regions without contractual residency coverage; auto-flag during deployment.
- Publish customer-facing view per region; align with SCCs/transfer impact assessments.

## 8) Regional Support Model

- Support hours and SLAs per tier/region; escalation matrix covering Legal/Security/Eng.
- Routing by region/language/severity/tier; multilingual diagnostics and in-app repair actions.
- Proactive alerts for regional dependency outages; regional evidence packs for audits.

## 9) Launch Gate (Controls Proven)

- Residency enforcement validated (storage, backups, keys, egress allowlists).
- Screening/export controls live with audit trails and exception registry.
- Procurement packet complete; contract riders and tax readiness verified.
- Localization smoke: key journeys screenshot-tested in major locales.
- Reliability: regional SLO dashboards, load-test results, failover posture decisions logged.
- Operations: runbooks with regional addenda, incident comms templates, support routing tested.

## 10) Tabletop Exercises (per region)

- **Regulator inquiry:** privacy/export controls documentation and evidence pack produced within SLA.
- **Outage:** region-aware incident comms, status updates, failover posture executed.
- **DSAR:** intake → verification → retrieval → redaction → delivery within local timelines.

## 11) Single Source of Truth

- This matrix is version-controlled in `docs/regional-expansion/` and owned by the Regionalization WG.
- Update per region at least quarterly; link to risk register, exception registry, and regional debt backlog.
- Maintain KPIs: win rate, cycle time, incidents, costs, churn, and one workaround retired monthly.

## Forward-Looking Enhancements

- **Evidence-as-code:** automate residency and screening evidence exports via policy engine events.
- **Regional digital twins:** simulate failover vs residency tradeoffs to pre-approve patterns.
- **Automated screening quality loop:** quarterly false-negative audit feeding model retraining and rule updates.
