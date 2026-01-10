# Annual Audit Rehearsal Scope & Questions (Board-Grade)

**Scope anchor:** This rehearsal asserts present readiness using the Summit Readiness Assertion and
canonical governance artifacts. Evidence is file-backed; no remediation is performed here. Any
ambiguity is marked as **Deferred pending X** or **Intentionally constrained** per governance.

**Authority files:**

- docs/SUMMIT_READINESS_ASSERTION.md
- docs/governance/CONSTITUTION.md
- docs/governance/META_GOVERNANCE.md
- docs/governance/AGENT_MANDATES.md
- agent-contract.json

---

## Release Integrity (GA freeze, drift prevention)

1. Where is the GA freeze / go-no-go policy defined and enforced? (GO_NO_GO_GATE.md, GA_READINESS_REPORT.md, release-policy.yml)
2. What evidence confirms the current release scope and readiness? (LAUNCH_SCOPE.md, FINAL_READINESS_REPORT.md)
3. How is architectural drift tracked and reconciled with declared scope? (ARCHITECTURE_MAP.generated.yaml, CI_AUDIT_CHANGES.md)
4. Where is PR merge governance and normalization recorded? (PR_MERGE_LEDGER.md, PR_NORMALIZATION_CHECKLIST.md)

## Security Posture (ledger, deferred risks, sunsets)

5. What artifacts define security gating for GA readiness? (SECURITY_GA_GATE.md, SECURITY_MITIGATIONS.md)
6. Where is immutable audit/ledger provenance defined? (PROVENANCE_SCHEMA.md, docs/audit/audit-trail.md)
7. What is the current security posture summary for executives? (SECURITY.md, HARDENING_REPORT.md)
8. Where are governed exceptions recorded? (docs/audit/EXCEPTIONS.md)

## Evidence & Verification (maps, verifiers, dashboard)

9. What is the authoritative evidence index and bundle manifest? (COMPLIANCE_EVIDENCE_INDEX.md, EVIDENCE_BUNDLE.manifest.json)
10. Where is the audit evidence system described? (docs/audit/README.md, docs/audit/EVIDENCE.md)
11. What CI hardening evidence exists to support verification claims? (CI_HARDENING_AUDIT_REPORT.md)
12. Where is the testing strategy for GA validation documented? (docs/ga/TESTING-STRATEGY.md, TESTING.md)

## Data & Privacy Boundaries

13. What artifacts define data handling, retention, and privacy boundaries? (COMPLIANCE_CONTROLS.md, COMPLIANCE_SOC_MAPPING.md)
14. Where is the attestation scope for data and system boundaries defined? (ATTESTATION_SCOPE.md)
15. What incident taxonomy covers data/PII events? (docs/incidents/INCIDENT_SEVERITY.md)

## Secrets & Logging Hygiene

16. Where are secrets handling and leak prevention controls documented? (SECURITY.md, gitleaks.json)
17. What logging/observability guardrails apply to sensitive data? (observability/README.md, SAFETY_INVARIANTS.md)

## Ops Cadence & Incident Response

18. What runbooks define operational cadence and response procedures? (RUNBOOKS/, docs/audit/incident-template.md)
19. Where is the incident signal map and escalation flow captured? (INCIDENT_SIGNAL_MAP.md)

## Support Boundaries & Escalation

20. What documents define ownership and escalation boundaries? (OWNERSHIP_MODEL.md, HUMAN_OWNER_GUIDE.md, CODEOWNERS)
21. What governance mandates define agent authority limits? (docs/governance/AGENT_MANDATES.md, agent-contract.json)

## Extension Governance

22. Where is extension or plugin governance described? (plugin-manifest.json, extensions/package.json)
23. What policy-as-code boundaries govern extensions? (policies/, export.rego)
24. What compliance mappings anchor extension risk to standards? (COMPLIANCE_ISO_MAPPING.md, COMPLIANCE_SOC_MAPPING.md)
