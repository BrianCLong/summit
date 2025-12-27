# Governance Loop

This document defines Summit’s governance loop for compliance drift:

1. **Detect** drift (CI failures, policy denies, missing signatures).
2. **Explain** what changed and why it violates policy.
3. **Remediate** with a minimal patch set.
4. **Verify** (policy tests green, signature checks pass).
5. **Document** evidence and prevention steps.

## Evidence Requirements

Every drift incident should capture:

- CI job URL(s) and failing step logs
- `opa test` output (before/after)
- `opa eval` output for the failing input (before/after)
- signature verification output (before/after), if applicable
- diffstat and commit SHAs

## Incident Template

Copy/paste for each incident and commit it (or link from PR):

## Incident: <drift_type> — <YYYY-MM-DD>

**Signal:** <CI job URL>

**Root Cause:**

- What violated policy?
- Where was the change introduced?

**Remediation:**

- What changed?
- Why is it minimal and safe?

**Verification:**

- `opa test` ✅
- `cosign verify-blob` ✅ (if required)

**Prevention:**

- What guardrail prevents recurrence?

## Drift Types

- `container_root`: image running as root
- `critical_cve`: critical vulnerability detected
- `unsigned_dep`: dependency missing signature/provenance
- `sbom_signature`: missing/invalid SBOM signature
