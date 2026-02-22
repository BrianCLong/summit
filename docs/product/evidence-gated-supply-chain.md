# Product Spec: Evidence-Gated Supply Chain Releases

## Summit Readiness Assertion
This spec is governed by `docs/SUMMIT_READINESS_ASSERTION.md`.

## User Stories
- **Developer**: As a developer, I want CI to emit evidence bundles so releases pass without
  manual compliance steps.
- **Security**: As security, I want provenance and signatures verified before release promotion.
- **Compliance**: As compliance, I want SSDF control coverage with evidence links.
- **Release Engineer**: As release engineering, I want deterministic gates and rollback evidence.

## Evidence Contract UX
File location: `policies/contracts/<org>/<repo>.yaml`

```yaml
requiredEvidence:
  sbom:
    - spdx-2.3
    - cyclonedx-1.7
  provenance:
    predicateType: https://slsa.dev/provenance/v1
signing:
  mode: connected
  allowedSigners:
    - fulcio://issuer.example.com
waivers:
  - id: TEMP-EXCEPTION-001
    reason: "Governed Exception: legacy build system"
    expiresAt: 2026-06-30
```

## SSDF Mapping UX
- Display PO.6, PS.3.2, PS.4 with evidence IDs and verification hashes.
- Provide exportable audit bundle (JSON + summary).

## Rollout Phases
- **Phase 0 (Alpha)**: OCI-only, connected signing, SLSA L1/L2 gates.
- **Phase 1 (Beta)**: add non-OCI artifact support, air-gapped mode, tenant isolation hardening.
- **Phase 2 (GA)**: residency controls, perf SLOs, audit package completeness.

## Go/No-Go Gates
- Multi-tenant isolation verified.
- Determinism tests pass with stable Evidence IDs.
- SSDF mapping report generated for PO.6/PS.3.2/PS.4.
- Air-gapped mode validates without public Rekor.
- Incident playbooks in place.

## Competitive Positioning
- Summit acts as an evidence-native control plane compatible with ecosystem formats while
  enforcing policy gates and deterministic evidence artifacts.
