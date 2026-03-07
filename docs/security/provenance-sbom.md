# Provenance + SBOM (PR Visibility + Enforcement)

Summit enforces visible, evidence-first provenance and SBOM outputs on every PR while preserving
GitHub OIDC trust boundaries. This implementation aligns with the Summit Readiness Assertion and
keeps provenance evidence visible even when keyless signing is intentionally constrained to trusted
contexts. See `docs/SUMMIT_READINESS_ASSERTION.md` for the readiness baseline.

## Goals

- Emit an SPDX SBOM for every PR and surface evidence in a single, stable comment.
- Provide deterministic `badge.json` + `report.json` artifacts for downstream PR UX (Shields).
- Maintain fail-closed semantics for missing SBOM outputs.
- Reserve keyless signing/attestations for trusted workflows with OIDC enabled.

## PR Flows (Trusted vs. Untrusted)

| Context | SBOM | Evidence JSON | Keyless sign + attest | Provenance status |
| --- | --- | --- | --- | --- |
| Fork PR (`pull_request`) | ✅ | ✅ | ❌ | `blocked` |
| Trusted PR / push | ✅ | ✅ | ✅ | `pass` (future PR2) |

**Key constraint:** GitHub OIDC `id-token: write` is not available to untrusted forks. This is why
PR1 emits `status="blocked"` for provenance when signing is not permitted.

## Evidence Bundle

Every run writes:

```
evidence/<sha>/badge.json
evidence/<sha>/report.json
evidence/<sha>/metrics.json
evidence/<sha>/stamp.json
evidence/<sha>/index.json
```

Evidence IDs:

- `EVD-ai-platform-dev-2026-02-07-PROV-001` — SBOM (SPDX JSON) present + linkable
- `EVD-ai-platform-dev-2026-02-07-PROV-004` — PR UX (badge.json + report.json)

## Required Check

The required check name is `provenance-sbom`. It always emits SBOM + evidence artifacts. Missing
SBOM output fails closed.

PR comments are updated in place using a hidden marker to avoid duplication.

## Badge Endpoint (PR3)

Once GitHub Pages publishing is enabled, expose:

```
https://img.shields.io/endpoint?url=<pages>/<sha>/badge.json
```

The badge JSON is deterministic and contains `label`, `message`, `color`, and `link`.

## Policy-Controller Enforcement (PR4)

Admission control uses Sigstore policy-controller with Rego policy requiring keyless signatures and
SPDX SBOM attestations. Enforcement remains namespace opt-in until validated.

## MAESTRO Alignment

- **MAESTRO Layers:** Security, Supply Chain, Observability, Tools.
- **Threats Considered:** OIDC token abuse, forged provenance metadata, SBOM omission, PR greenwash.
- **Mitigations:** Fail-closed SBOM gate, deterministic evidence JSON, trusted-only keyless signing,
  comment gating for fork PRs, and policy-controller admission checks.

## Rollback

Disable the workflow (`.github/workflows/provenance-sbom.yml`) and revert PR-visible artifacts. The
namespace-scoped policy-controller deployment remains opt-in until explicitly enabled.
