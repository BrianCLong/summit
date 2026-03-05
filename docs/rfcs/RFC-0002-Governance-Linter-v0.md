# RFC-0002: Governance Linter v0

## 1. Context and Objective

As a governance-first AI platform, Summit requires a mechanism to enforce policy-as-code. The Governance Linter translates enterprise requirements into verifiable CI checks, producing structured trust telemetry.

This RFC defines the v0 scope, architecture, and output schema for the Governance Linter.

## 2. Scope (v0)

The v0 linter will focus on high-signal infrastructure and AI-specific rules.

### 2.1 Infra Rules
*   **Node Version Policy**: Enforce version pinning via `.nvmrc` and package manager settings.
*   **Required SBOM**: Detect generation of Software Bill of Materials in production builds.
*   **Signature Presence**: Verify the use of `cosign` or equivalent for artifact signing.
*   **GitHub OIDC Usage**: Ensure external cloud credentials rely on OIDC rather than static secrets.

### 2.2 AI Rules (Foundational Moat)
*   **Agent Manifests**: Manifests must explicitly declare tool permissions.
*   **Network Access**: External network access must be statically declared.
*   **PII Tagging**: Data flows handling PII must be appropriately tagged and scoped.

## 3. Output Schema

The linter must output machine-readable JSON to feed into the IntelGraph and trust telemetry systems.

```json
{
  "severity": "high",
  "rule": "missing-sbom",
  "target": "build-artifact",
  "message": "SBOM required for production artifacts"
}
```

## 4. Modes of Operation
*   **Advisory Mode**: Reports violations without failing the CI build (useful for onboarding new rules).
*   **Blocking Mode**: Fails the build for violations (e.g., `severity: critical` or `severity: high`).

## 5. Next Steps
*   Implement the core linting engine.
*   Draft the initial set of rules in `docs/ci/linter/rules/`.
