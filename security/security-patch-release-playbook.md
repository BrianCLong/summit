# Security Patch-Release Playbook

## Objectives
- Triage GitHub security alerts quickly and assign severity/owner.
- Ship hotfix branches with deterministic release steps and provenance.
- Capture risk-impact change logs and CVE handling artifacts for audits.

## Intake and triage (target: <24h)
1. **Collect alerts**: GitHub Security advisories, Dependabot, runtime findings (Trivy, Snyk).
2. **Classify**: Map to CVSS, data-sensitivity, exploitability, and exposure surface (public/internal).
3. **Owner + SLA**:
   - Critical: fix/mitigate in ≤24h.
   - High: fix/mitigate in ≤72h.
   - Medium: fix/mitigate in ≤7d.
   - Low/Informational: bundle into scheduled maintenance.
4. **Containment**: feature flags, WAF/rate-limit tightening, temporary policy denies for IDOR-prone paths.
5. **Evidence**: log alert IDs, CVEs, packages, versions, and mitigations in `SECURITY/risk-change-log.md`.

## Hotfix branch and release flow
1. **Branching**: `hotfix/security/<cve-or-ticket>` from the latest release tag.
2. **Fix and tests**:
   - Apply minimal changes; add targeted regression tests.
   - Run `pnpm lint && pnpm test`, plus affected service smoke tests.
   - Capture SBOM diff (`trivy sbom --format cyclonedx --output sbom.cdx.json`).
3. **Provenance**:
   - Require SLSA attestation artifact committed to `provenance/` (see SLSA section below).
   - Sign release artifacts with Cosign and attach SBOM + attestation to the release.
4. **Review gate**:
   - Security reviewer approval required.
   - CI must pass `security-gate` workflow (Trivy + SLSA verification).
5. **Release tagging**: tag as `vX.Y.Z-secN` with release notes summarizing blast radius and mitigations.
6. **Post-release validation**: verify rollout, monitor error budgets, and confirm WAF/rate-limit counters return to baseline.

## CVE handling
- Track CVE ID, affected package, fixed version, and remediation status.
- If no upstream fix, document compensating controls (feature flags, WAF, request validation, rate caps).
- Backport fixes to supported branches; record cherry-picks in the change log.

## Risk-impact change log (auditable)
Maintain `SECURITY/risk-change-log.md` with entries:
- Date/time and responder
- Alert/CVE IDs and severity
- Impacted components/services
- Fix version/commit and deployment window
- Mitigations, compensating controls, and residual risk
- Links to SBOM diff, attestation, and verification logs

## SLSA attestation verification
- Store provenance documents in `provenance/*.intoto.jsonl`.
- CI enforces presence and schema via `.github/workflows/security-gate.yml`.
- Verification steps (local or CI):
  ```bash
  VERSION=2.5.1
  curl -sSL -o slsa-verifier "https://github.com/slsa-framework/slsa-verifier/releases/download/v${VERSION}/slsa-verifier-linux-amd64"
  install -m 0755 slsa-verifier /usr/local/bin/slsa-verifier
  slsa-verifier verify-attestation \
    --provenance provenance/sample-provenance.intoto.jsonl \
    --source-uri "https://github.com/summit/summit" \
    --source-tag "<tag-or-branch>"
  ```
- Fail the release if attestation is missing or verification errors.

## Rate limiting and IDOR guardrails
- Ensure all ingress paths use shared rate-limit middleware (`server/src/middleware`) with tenant/user keys.
- Harden GraphQL with depth/complexity rules and validation tests (see middleware tests).
- For IDOR surfaces, require resource-scoped authorization checks and audit logging.

## Communication and disclosure
- Internal: post summary in #security-ops with mitigations and residual risk.
- External: coordinate with legal for CVE publication; update SECURITY.md with advisories.
- Customers: send release announcement referencing the security tag and mitigations.
