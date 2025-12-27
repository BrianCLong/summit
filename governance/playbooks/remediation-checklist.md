# Remediation Checklist

Use this checklist for any drift incident.

## 1) Triage

- Identify failing CI job(s) and step(s)
- Capture log excerpts with the exact deny message(s)
- Classify drift type:
  - container_root / critical_cve / unsigned_dep / sbom_signature

## 2) Patch

- Implement minimal change to restore compliance
- Avoid unrelated refactors
- Add/adjust tests if the drift revealed a gap

## 3) Verify

- `opa test governance/policies governance/tests -v`
- `opa eval` for the failing input (confirm deny list empty)
- `cosign verify-blob` (if signatures are required)

## 4) Document

- Update `docs/GOVERNANCE_LOOP.md` with an incident entry or link PR evidence
- Include: root cause, fix, verification, prevention
