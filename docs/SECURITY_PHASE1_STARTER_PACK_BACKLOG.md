# Phase 1 Security Starter Pack Backlog (Epics 1–4)

This backlog turns the first four security epics into an executable Phase 1 delivery plan that ships a hardened vertical slice without blocking delivery. It targets one **pilot service** for enforced controls and sets advisory-only posture elsewhere until expansion.

## Scope and objectives

- **Pilot service**: Representative, frequently deployed, has external dependencies, and handles user or business data.
- **Goals**: Prove end-to-end supply-chain integrity, reduce CI/IAM blast radius, eliminate long-lived secrets, and enforce environment boundaries with policy guardrails.
- **Success criteria**: Pilot deploys to stage only when signature and provenance verification succeed; CI uses least-privilege OIDC; one high-value static secret is removed or rotated; IAM scope constrains CI to stage-only for the pilot.

## Definition of Done (Phase 1)

- `cosign verify` + provenance verification gate the pilot stage deploy; failures block rollout.
- SBOM + provenance artifacts stored and linked to build digest.
- CI workflows set minimal permissions by default and pin third-party actions by SHA.
- Pilot deploy uses OIDC with scoped AWS role; no static cloud keys in CI for deploy.
- “Top 3” secrets inventoried; at least one pilot secret replaced with short-lived or rotated secret and rotation drill executed in non-prod.
- IAM roles narrowed per environment with policy guardrails to prevent wildcard or cross-env access; CI role limited to stage for pilot resources.

## CI/policy gates to ship in Phase 1

- **Build**: CycloneDX SBOM + SLSA provenance generation; cosign keyless signing of pilot image.
- **Deploy**: `cosign verify` + `cosign verify-attestation --type slsaprovenance`; fail build if either check fails.
- **Policy**: OPA/Conftest rules in CI to block IAM wildcards, public exposure, or missing required tags; freeze-window check before deploy.
- **Security hygiene**: Secret scanning + push protection required; caches use scoped keys to prevent poisoning.
- **Access**: Deploy workflows declare minimal `permissions:`; OIDC tokens scoped to stage role; break-glass approvals logged with expiry.

## Roles

- **Platform**: CI/CD hardening, workflow updates, deploy gates, caches.
- **Security**: SBOM/provenance/signing policy, OPA rules, secret rotation runbooks, break-glass policy.
- **SRE**: Deploy integration, canary/rollback wiring, observability for gates.
- **Service Team**: Pilot service code/config changes, secret consumers, verifying functional impact.

## Backlog (ready for sprint planning)

### Epic 1 — Supply-chain Integrity (Pilot enforced)

| ID   | Ticket                                                          | Owner        | DoD                                                           | Dependencies           |
| ---- | --------------------------------------------------------------- | ------------ | ------------------------------------------------------------- | ---------------------- |
| E1.1 | Add CycloneDX SBOM generation to pilot build                    | Platform     | SBOM artifact uploaded per build and linked to digest         | Pilot service selected |
| E1.2 | Add SLSA provenance attestation generation                      | Platform     | Provenance artifact stored with digest reference              | E1.1                   |
| E1.3 | Sign pilot container image with keyless cosign in CI            | Platform     | Signature created per build; stored digest + cert chain       | E1.2                   |
| E1.4 | Add deploy gate: block if image missing signature or provenance | Platform/SRE | Stage deploy fails on missing/invalid signature or provenance | E1.3                   |
| E1.5 | Post SBOM diff comments on PRs                                  | Platform     | PR shows dependency delta from previous release baseline      | E1.1                   |
| E1.6 | Implement exception allowlist file with expiry + owner          | Security     | Exceptions require owner + expiry; CI fails expired entries   | E1.4                   |

### Epic 2 — CI/CD Hardening

| ID   | Ticket                                                                | Owner             | DoD                                                                    | Dependencies |
| ---- | --------------------------------------------------------------------- | ----------------- | ---------------------------------------------------------------------- | ------------ |
| E2.1 | Set minimal `permissions:` for all workflows (deny by default)        | Platform          | All workflows declare minimal permissions; audits show no broad scopes | None         |
| E2.2 | Pin third-party GitHub Actions by commit SHA (deploy workflows first) | Platform          | All deploy workflows pin actions; audit script passes                  | E2.1         |
| E2.3 | Migrate pilot deploy to AWS via OIDC (no static keys)                 | Platform          | Deploy uses OIDC role; no cloud secrets stored in repo/CI              | E2.1         |
| E2.4 | Harden CI caches with scoped keys and branch isolation                | Platform          | Privileged jobs use isolated cache keys; cache policy documented       | E2.1         |
| E2.5 | Add freeze-window/policy check step before deploy                     | Platform/Security | Deploy aborts in freeze unless break-glass approved and logged         | E2.2         |

### Epic 3 — Secrets & Rotation

| ID   | Ticket                                                             | Owner             | DoD                                                                                    | Dependencies |
| ---- | ------------------------------------------------------------------ | ----------------- | -------------------------------------------------------------------------------------- | ------------ |
| E3.1 | Inventory and classify secrets (pilot + org top 10)                | Security          | Classified list with criticality and storage location                                  | None         |
| E3.2 | Replace one pilot static secret with short-lived token or rotation | Platform/Service  | Secret removed from static store; rotation verified in non-prod                        | E3.1         |
| E3.3 | Automate rotation for top 3 secrets (DB, API key, webhook)         | Security/Platform | Rotation runbooks automated + tested; audit logs retained                              | E3.1         |
| E3.4 | Add leak response playbook and drill                               | Security/SRE      | Drill executed; revoke/rotate + audit search + redeploy completed within target window | E3.2         |

### Epic 4 — IAM Boundaries + OPA Guardrails

| ID   | Ticket                                                             | Owner             | DoD                                                                      | Dependencies |
| ---- | ------------------------------------------------------------------ | ----------------- | ------------------------------------------------------------------------ | ------------ |
| E4.1 | Map CI roles to permissions actually used (CloudTrail diff)        | Security          | Report of used vs granted perms with proposed reductions                 | E2.1         |
| E4.2 | Create environment boundary roles with explicit denyrails          | Security/Platform | Dev/Stage/Prod roles deployed; denies block cross-env access             | E4.1         |
| E4.3 | Add OPA/Conftest IAM guardrails in CI (block wildcards/public)     | Security          | CI fails policies with actionable messages; baseline policies checked in | E4.2         |
| E4.4 | Require step-up auth for sensitive actions (break-glass, prod IAM) | Security/SRE      | MFA/WebAuthn required and logged; process documented                     | E4.2         |

## Sequencing for the pilot (vertical slice)

1. Select pilot service and document 1-page threat model.
2. Implement SBOM + provenance + cosign signing (E1.1–E1.3).
3. Add verify-before-deploy gate and exception allowlist (E1.4, E1.6).
4. Tighten CI permissions, pin actions, and shift deploy to OIDC (E2.1–E2.3).
5. Remove/rotate one pilot secret and run leak drill (E3.2, E3.4).
6. Narrow CI IAM role to stage-only with OPA guardrails (E4.1–E4.3).
7. Enable freeze-window policy and cache hardening (E2.4–E2.5).

## Reporting and checkpoints

- **Weekly**: Gate success/failure rates, exceptions opened/closed, secret rotation status, IAM diff progress.
- **Exit** (Phase 1 complete): Demonstrated stage deploy with enforced verify; no static cloud keys in CI; at least one rotated secret; CI role constrained to stage with OPA guardrails; break-glass path documented and tested.

## CI validation steps (pilot example)

- `cosign verify --certificate-identity-regexp "https://github.com/.+" --certificate-oidc-issuer "https://token.actions.githubusercontent.com" $IMAGE_DIGEST`
- `cosign verify-attestation --type slsaprovenance $IMAGE_DIGEST`
- `conftest test policy/iam` (blocks wildcards/public exposure/missing tags)
- `rg "uses: .*@" .github/workflows | rg -v "@([a-f0-9]{40})"` (fails on unpinned actions)
- Secret scan + push protection enabled; freeze-window check before deploy.

## Owners and communications

- **Owners**: Platform (CI/CD), Security (policy + secrets), SRE (deploy/canary/rollback), Service Team (pilot changes).
- **Stakeholders notified**: Platform, Security, SRE leads for approvals and break-glass rotations.

## Risk notes

- **Risk score**: 68 (high). Enforced gates on the pilot reduce immediate supply-chain and IAM blast radius while enabling phased rollout to remaining services.
