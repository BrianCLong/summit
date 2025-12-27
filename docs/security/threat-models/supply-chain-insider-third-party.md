# Supply Chain, Insider, and Third-Party Assurance Threat Model

**Owner:** Security + Platform Governance
**Risk Tier:** Critical
**Last Updated:** 2025-12-27

## 1. Feature Overview

IntelGraph depends on external software artifacts, cloud vendors, and human operators. This threat model covers the end-to-end
supply chain (source → build → deploy), insider misuse of elevated access, and integrations with external vendors/partners.

## 2. Assets

| Asset                              | Sensitivity | Description                                                          |
| ---------------------------------- | ----------- | -------------------------------------------------------------------- |
| Build pipelines and runners        | Critical    | CI/CD runners, signing keys, provenance attestations                 |
| Dependency manifests and lockfiles | High        | package.json, pnpm-lock.yaml, Cargo manifests, container base images |
| Deployment artifacts               | Critical    | Container images, Helm charts, Terraform state                       |
| Vendor/partner connectors          | High        | Integrations that introduce third-party code and data                |
| Access tokens and secrets          | Critical    | Tokens for registries, cloud providers, vendors                      |

## 3. Entry Points

| Entry Point             | Protocol            | Authentication            | Trust Level   |
| ----------------------- | ------------------- | ------------------------- | ------------- |
| Dependency updates      | HTTPS/git           | Registry + MFA            | Semi-trusted  |
| Container builds        | OCI/Docker          | Registry + Sigstore       | Semi-trusted  |
| CI/CD workflow triggers | GitHub Actions/Just | SSO + RBAC + OIDC         | Trusted       |
| Vendor connectors       | HTTPS/Webhooks      | API keys/OAuth            | External      |
| Operator consoles       | SSH/SRE portals     | MFA + Just-in-time access | Trusted human |

## 4. Trust Boundaries

| Boundary                         | From          | To                    | Controls                                  |
| -------------------------------- | ------------- | --------------------- | ----------------------------------------- |
| Developer workstation → VCS      | Untrusted     | Signed commits        | GPG/Sigstore signing, pre-commit hooks    |
| Repo → CI/CD runners             | Semi-trusted  | Hardened runners      | Ephemeral runners, OIDC workload identity |
| CI/CD → Artifact registry        | Semi-trusted  | Signed artifacts      | Cosign signing, provenance attestation    |
| Vendor connector → Core services | External      | Authenticated adapter | Scoped API tokens, ingress validation     |
| Operations → Production          | Trusted human | Privileged systems    | JIT access, dual control, audit logging   |

## 5. Threats

| ID   | Category               | Threat                                                                | Likelihood | Impact   | Risk     |
| ---- | ---------------------- | --------------------------------------------------------------------- | ---------- | -------- | -------- |
| SC-1 | Tampering              | Dependency substitution or typosquatting during build                 | Medium     | Critical | Critical |
| SC-2 | Information Disclosure | Compromised container base image leaking secrets                      | Low        | High     | High     |
| TP-1 | Elevation of Privilege | Third-party connector abusing scopes                                  | Medium     | High     | High     |
| IN-1 | Over-Autonomy          | Privileged insider bypassing peer review or deploying unsigned builds | Low        | Critical | High     |
| IN-2 | Repudiation            | Insider deleting audit trails after misconfiguration                  | Low        | High     | High     |

## 6. Mitigations

| Threat ID | Mitigation                                                                     | Status      | Implementation                                                                 |
| --------- | ------------------------------------------------------------------------------ | ----------- | ------------------------------------------------------------------------------ |
| SC-1      | Enforce pinned dependencies, lockfile verification, and SLSA provenance checks | Implemented | `scripts/security/check-threat-model-coverage.ts`, CI SLSA attestations        |
| SC-2      | Mandatory base image scanning and cosign signature verification before deploy  | Implemented | `.github/workflows/*.yml` supply chain jobs                                    |
| TP-1      | Least-privilege tokens and contract-level allowlists for connectors            | In-Progress | Connector scaffolds under `services/` and `packages/` with scoped API keys     |
| IN-1      | Dual-approval and signed releases for privileged changes                       | In-Progress | ADR design gate + `scripts/security/enforce-threat-model-design.ts` + Sigstore |
| IN-2      | Immutable audit logging with daily export to cold storage                      | Implemented | `security/threat-models` + `audit/` evidence pipelines                         |

## 7. Residual Risk

| Threat ID | Residual Risk                                                                | Acceptance | Accepted By    |
| --------- | ---------------------------------------------------------------------------- | ---------- | -------------- |
| SC-1      | Residual exposure to newly published exploits before scanner updates         | Low        | Security Lead  |
| TP-1      | Vendor-side compromise may still exfiltrate limited scoped data              | Medium     | Platform Owner |
| IN-1      | Insider collusion could bypass dual control; mitigated via anomaly detection | Medium     | CISO           |

## 8. Control Automation Hooks

- Controls for SC-1/SC-2/TP-1/IN-1 are parameterized in `docs/security/control-implementations.json`.
- `scripts/security/generate-control-automation.ts` renders executable runbooks in `docs/security/generated/control-automation-plan.md`.
- CI jobs consume the generated plan to wire dependency scanning, cosign verification, and connector scope validation without
  manual duplication.

## 9. Review Cadence

- **Critical path**: Validate before every feature design involving new vendors, build tooling, or privileged operators.
- **Scheduled**: 30-day cadence for supply chain/insider controls; 60-day cadence for third-party connectors.
