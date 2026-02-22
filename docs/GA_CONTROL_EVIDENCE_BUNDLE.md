# GA Control Evidence Bundle

## Objective

Provide control-to-test-to-artefact traceability for GA review across SOC 2, ISO 27001, and FedRAMP-aligned controls. This bundle is intended to be regenerated automatically and versioned alongside the codebase.

## Traceability Grid

| Framework / Requirement               | Control Implementation                                                                                                     | Test / Validation                                                                                             | Artefact Source                                                                                |
| ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| SOC 2 CC7.2 (Change Management)       | Policy-as-code in `ga-graphai/packages/policy` with enforcement checkpoints in `agentic/` pipelines                        | CI gating via `CI_STANDARDS.md` and policy regression in `scripts/check-boundaries.cjs`                       | Policy snapshots + CI logs archived per `COMPLIANCE_EVIDENCE_INDEX.md`                         |
| SOC 2 CC9.2 (Access Control)          | AuthZ boundary definitions in `AUTHZ_IMPLEMENTATION_SUMMARY.md` and `BOUNDARIES.md`; rate limits in `API_RATE_LIMITING.md` | Automated tests referenced in `ALERT_POLICIES.yaml` and service health probes in `runbooks/`                  | Access review reports and alert exports captured in `EVIDENCE_BUNDLE.manifest.json`            |
| ISO 27001 A.12.4 (Logging)            | Provenance ledger in `ga-graphai/packages/prov-ledger` and audit schema in `PROVENANCE_SCHEMA.md`                          | Log integrity checks executed during `make smoke` and observability hooks defined in `INCIDENT_SIGNAL_MAP.md` | Immutable ledger exports and Grafana snapshots indexed in `COMPLIANCE_EVIDENCE_INDEX.md`       |
| ISO 27001 A.14.2 (Secure Development) | Secure coding baselines in `SECURITY_MITIGATIONS.md` and `SECURITY_HARDENING` guidelines                                   | Static analysis + dependency review pipelines defined in `.github/` workflows                                 | SARIF outputs plus third-party attestation receipts stored under `/security/` evidence folders |
| FedRAMP SI-4 (System Monitoring)      | Alert policies codified in `ALERT_POLICIES.yaml` and SLOs in `slo-config.yaml`                                             | Synthetic probes and chaos drills defined in `runbooks/` and `slo/` test packs                                | Probe results ingested into `EVIDENCE_BUNDLE.manifest.json` with links to dashboards           |
| FedRAMP RA-5 (Vulnerability Scanning) | Scanning cadence and scope defined in `SECURITY.md` and `DEPENDENCY_UPDATE_PLAN.md`                                        | Scheduled scans executed via `Makefile` targets and `validate_phase3_comprehensive.py` harness                | Scan reports (PDF/JSON) cataloged in `COMPLIANCE_EVIDENCE_INDEX.md`                            |

## Evidence Assembly Flow

1. **Collect requirements** from `COMPLIANCE_CONTROLS.md` and framework mappings (`COMPLIANCE_ISO_MAPPING.md`, `COMPLIANCE_SOC_MAPPING.md`).
2. **Bind controls** to implementations documented above and align with runbooks in `runbooks/`.
3. **Execute tests** (unit, integration, and smoke) plus policy regression via `scripts/check-boundaries.cjs`.
4. **Export artefacts**: attach CI logs, ledger exports, and alert snapshots to `EVIDENCE_BUNDLE.manifest.json`.
5. **Publish bundle**: surface the generated JSON on the documentation site via `pnpm --filter @topicality/website docs:generate`.

## Maintenance

- Update this bundle whenever policies, schemas, or runbooks change.
- Keep artefact pointers synchronized with `COMPLIANCE_EVIDENCE_INDEX.md` to avoid evidence drift.
- Record deviations or compensating controls directly in this file under a dated heading for auditability.
