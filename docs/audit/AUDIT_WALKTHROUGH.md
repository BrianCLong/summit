# Audit Evidence Walkthrough (Timed)

**Objective:** Demonstrate audit readiness using repo-local artifacts and commands only.
**Total target time:** 78 minutes (≤ 90 minutes)

> Commands are read-only and local. Evidence is file-backed; no screenshots.

## Release Integrity

1. **GA freeze / go-no-go policy**
   - **Artifacts:** GO_NO_GO_GATE.md, GA_READINESS_REPORT.md, release-policy.yml
   - **Commands:**
     - `rg -n "go-no-go|freeze|ga" GO_NO_GO_GATE.md`
     - `rg -n "GA" GA_READINESS_REPORT.md`
     - `cat release-policy.yml`
   - **Expected indicator:** Explicit GA gate criteria and release policy definitions.
   - **Time:** 4 min

2. **Release scope & readiness evidence**
   - **Artifacts:** LAUNCH_SCOPE.md, FINAL_READINESS_REPORT.md
   - **Commands:**
     - `rg -n "scope|readiness" LAUNCH_SCOPE.md`
     - `rg -n "readiness" FINAL_READINESS_REPORT.md`
   - **Expected indicator:** Declared scope and readiness status are present.
   - **Time:** 3 min

3. **Architecture drift tracking**
   - **Artifacts:** ARCHITECTURE_MAP.generated.yaml, CI_AUDIT_CHANGES.md
   - **Commands:**
     - `rg -n "drift|change" CI_AUDIT_CHANGES.md`
     - `head -n 20 ARCHITECTURE_MAP.generated.yaml`
   - **Expected indicator:** Drift/change audit trail and current architecture map.
   - **Time:** 3 min

4. **PR merge governance**
   - **Artifacts:** PR_MERGE_LEDGER.md, PR_NORMALIZATION_CHECKLIST.md
   - **Commands:**
     - `rg -n "merge" PR_MERGE_LEDGER.md`
     - `rg -n "normalization|checklist" PR_NORMALIZATION_CHECKLIST.md`
   - **Expected indicator:** Merge ledger and normalization criteria exist.
   - **Time:** 3 min

## Security Posture

5. **GA security gate**
   - **Artifacts:** SECURITY_GA_GATE.md, SECURITY_MITIGATIONS.md
   - **Commands:**
     - `rg -n "gate|ga" SECURITY_GA_GATE.md`
     - `rg -n "mitigation" SECURITY_MITIGATIONS.md`
   - **Expected indicator:** Explicit GA security gating and mitigations.
   - **Time:** 4 min

6. **Immutable audit / provenance ledger**
   - **Artifacts:** PROVENANCE_SCHEMA.md, docs/audit/audit-trail.md
   - **Commands:**
     - `rg -n "ledger|hash|immutable" PROVENANCE_SCHEMA.md`
     - `rg -n "audit" docs/audit/audit-trail.md`
   - **Expected indicator:** Hash-chained or immutable audit definitions.
   - **Time:** 4 min

7. **Security posture summary**
   - **Artifacts:** SECURITY.md, HARDENING_REPORT.md
   - **Commands:**
     - `rg -n "security|posture" SECURITY.md`
     - `rg -n "hardening" HARDENING_REPORT.md`
   - **Expected indicator:** Consolidated security posture statements.
   - **Time:** 3 min

8. **Governed exceptions**
   - **Artifacts:** docs/audit/EXCEPTIONS.md
   - **Commands:**
     - `cat docs/audit/EXCEPTIONS.md`
   - **Expected indicator:** Exceptions are recorded and justified.
   - **Time:** 2 min

## Evidence & Verification

9. **Evidence index and bundle manifest**
   - **Artifacts:** COMPLIANCE_EVIDENCE_INDEX.md, EVIDENCE_BUNDLE.manifest.json
   - **Commands:**
     - `rg -n "evidence" COMPLIANCE_EVIDENCE_INDEX.md`
     - `head -n 20 EVIDENCE_BUNDLE.manifest.json`
   - **Expected indicator:** Evidence index and manifest mapping.
   - **Time:** 3 min

10. **Audit evidence system**
    - **Artifacts:** docs/audit/README.md, docs/audit/EVIDENCE.md
    - **Commands:**
      - `rg -n "evidence" docs/audit/README.md`
      - `rg -n "evidence" docs/audit/EVIDENCE.md`
    - **Expected indicator:** Defined evidence system and handling.
    - **Time:** 3 min

11. **CI hardening evidence**
    - **Artifacts:** CI_HARDENING_AUDIT_REPORT.md
    - **Commands:**
      - `rg -n "CI|hardening|audit" CI_HARDENING_AUDIT_REPORT.md`
    - **Expected indicator:** CI hardening audit entries.
    - **Time:** 3 min

12. **Testing strategy for GA**
    - **Artifacts:** docs/ga/TESTING-STRATEGY.md, TESTING.md
    - **Commands:**
      - `rg -n "Golden Path|smoke" docs/ga/TESTING-STRATEGY.md`
      - `rg -n "test" TESTING.md`
    - **Expected indicator:** GA testing strategy and test catalog.
    - **Time:** 4 min

## Data & Privacy Boundaries

13. **Data handling and privacy controls**
    - **Artifacts:** COMPLIANCE_CONTROLS.md, COMPLIANCE_SOC_MAPPING.md
    - **Commands:**
      - `rg -n "data|privacy|retention" COMPLIANCE_CONTROLS.md`
      - `rg -n "privacy|data" COMPLIANCE_SOC_MAPPING.md`
    - **Expected indicator:** Explicit privacy and data control mapping.
    - **Time:** 4 min

14. **Attestation scope**
    - **Artifacts:** ATTESTATION_SCOPE.md
    - **Commands:**
      - `rg -n "scope|attestation" ATTESTATION_SCOPE.md`
    - **Expected indicator:** Formal scope definition.
    - **Time:** 2 min

15. **Incident taxonomy for data/PII**
    - **Artifacts:** docs/incidents/INCIDENT_SEVERITY.md
    - **Commands:**
      - `rg -n "Data" docs/incidents/INCIDENT_SEVERITY.md`
    - **Expected indicator:** Data/PII incidents classified.
    - **Time:** 2 min

## Secrets & Logging Hygiene

16. **Secrets handling**
    - **Artifacts:** SECURITY.md, gitleaks.json
    - **Commands:**
      - `rg -n "secret|credential" SECURITY.md`
      - `head -n 20 gitleaks.json`
    - **Expected indicator:** Secrets policy and leak scanning config.
    - **Time:** 3 min

17. **Logging/observability guardrails**
    - **Artifacts:** observability/README.md, SAFETY_INVARIANTS.md
    - **Commands:**
      - `rg -n "logging|observability" observability/README.md`
      - `rg -n "PII|log" SAFETY_INVARIANTS.md`
    - **Expected indicator:** Logging hygiene and safety invariants.
    - **Time:** 3 min

## Ops Cadence & Incident Response

18. **Operational runbooks**
    - **Artifacts:** RUNBOOKS/, docs/audit/incident-template.md
    - **Commands:**
      - `ls RUNBOOKS | head`
      - `rg -n "incident" docs/audit/incident-template.md`
    - **Expected indicator:** Runbook inventory and incident template.
    - **Time:** 3 min

19. **Incident signal map**
    - **Artifacts:** INCIDENT_SIGNAL_MAP.md
    - **Commands:**
      - `rg -n "signal|escalation" INCIDENT_SIGNAL_MAP.md`
    - **Expected indicator:** Defined signal-to-response mapping.
    - **Time:** 2 min

## Support Boundaries & Escalation

20. **Ownership and escalation boundaries**
    - **Artifacts:** OWNERSHIP_MODEL.md, HUMAN_OWNER_GUIDE.md, CODEOWNERS
    - **Commands:**
      - `rg -n "owner|ownership" OWNERSHIP_MODEL.md`
      - `rg -n "human" HUMAN_OWNER_GUIDE.md`
      - `head -n 20 CODEOWNERS`
    - **Expected indicator:** Clear ownership and escalation boundaries.
    - **Time:** 4 min

21. **Agent authority limits**
    - **Artifacts:** docs/governance/AGENT_MANDATES.md, agent-contract.json
    - **Commands:**
      - `rg -n "authority|mandate" docs/governance/AGENT_MANDATES.md`
      - `rg -n "allowed" agent-contract.json`
    - **Expected indicator:** Explicit limits and contracts.
    - **Time:** 3 min

## Extension Governance

22. **Extension/plugin governance**
    - **Artifacts:** plugin-manifest.json, extensions/package.json
    - **Commands:**
      - `head -n 20 plugin-manifest.json`
      - `cat extensions/package.json`
    - **Expected indicator:** Plugin manifest and extension packaging.
    - **Time:** 3 min

23. **Policy-as-code boundaries for extensions**
    - **Artifacts:** policies/, export.rego
    - **Commands:**
      - `ls policies | head`
      - `rg -n "package|allow|deny" export.rego`
    - **Expected indicator:** Policy definitions exist for governance.
    - **Time:** 3 min

24. **Compliance mapping for extensions**
    - **Artifacts:** COMPLIANCE_ISO_MAPPING.md, COMPLIANCE_SOC_MAPPING.md
    - **Commands:**
      - `rg -n "ISO" COMPLIANCE_ISO_MAPPING.md`
      - `rg -n "SOC" COMPLIANCE_SOC_MAPPING.md`
    - **Expected indicator:** Compliance mappings are present.
    - **Time:** 3 min

---

**Total target time:** 78 minutes
