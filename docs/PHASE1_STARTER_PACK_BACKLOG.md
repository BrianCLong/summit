# Phase 1 Starter Pack: Enforced Backlog for Epics 1–4

## Context and Objectives
- **Risk score:** 68; high confidence. Focus on the fastest blast-radius reducers and the minimum viable supply-chain gate to avoid bypasses.
- **Goal (30 days):** One pilot service deploys to **stage** only when signature + provenance verification passes, CI roles are least-privileged via OIDC, and at least one high-value static secret is replaced or rotated.
- **Approach:** Enforce on the **pilot service**, run **advisory** elsewhere. Scale after proving the vertical slice.

## Roles and Ownership
| Domain | Owner | Responsibilities |
| --- | --- | --- |
| Platform | `platform-lead` | CI/CD hardening, workflow permissions, caches, deploy flow |
| Security | `security-lead` | Supply-chain controls, policy gates, exception process |
| SRE | `sre-lead` | Deploy pipeline guardrails, rollout/canary, observability |
| App Team (pilot) | `pilot-owner` | Implements service changes, secret rotation, accepts gates |

## Pilot Service Criteria
- Frequently deployed, touches external dependencies and data, has a non-prod deploy path.
- Representative authentication/egress patterns so IAM and egress lessons generalize.

## Definition of Done (Phase 1)
- **Gate:** Stage deploy for pilot fails unless **cosign verify** + **provenance verify** succeed.
- **Materials:** SBOM and provenance stored and linked to image digest.
- **CI Posture:** Deploy workflow uses **OIDC** with least-privilege role; no static AWS keys.
- **Secrets:** At least one high-value static secret replaced with short-lived or rotated secret; top 3 have rotation runbooks tested in non-prod.
- **IAM Boundary:** Pilot CI role scoped to stage resources for the pilot service only.

## CI/Policy Gates to Enforce First
1. **Build integrity:** Generate CycloneDX SBOM + SLSA provenance; sign image (keyless cosign).
2. **Deploy gate:** Block deploy if signature or provenance verification fails.
3. **Workflow permissions:** Default deny; minimal `permissions:` block; pin third-party actions by SHA (deploy workflows first).
4. **Identity for deploy:** Use GitHub OIDC -> AWS role with explicit stage-only permissions; remove static keys.
5. **Secrets:** Secret scan + push protection; rotate one pilot secret to short-lived token.
6. **Policy checks:** OPA/Conftest in CI to block IAM wildcards and public exposure patterns; freeze-window check on deploy jobs.

## Phase 1 Backlog (Ready to Ticket)
### Epic 1 — Supply-chain Integrity (Pilot enforced, others advisory)
- **E1.1** Add CycloneDX SBOM generation to pilot build (store artifact)
- **E1.2** Add provenance attestation generation
- **E1.3** Sign pilot image (keyless cosign) in CI
- **E1.4** Deploy gate: block if image is unsigned **or** lacks provenance
- **E1.5** SBOM diff comment on PRs (dependency delta)
- **E1.6** Exception mechanism: allowlist file with expiry + owner

### Epic 2 — CI/CD Hardening
- **E2.1** Set minimal `permissions:` for all workflows (deny by default)
- **E2.2** Pin third-party actions by commit SHA (deploy workflows first)
- **E2.3** Migrate pilot deploy to AWS via OIDC (no static keys)
- **E2.4** Harden caches (scoped keys; avoid cross-branch poisoning on privileged jobs)
- **E2.5** Add freeze-window check step to deploy job (policy-driven)

### Epic 3 — Secrets & Rotation
- **E3.1** Inventory and classify secrets by criticality (deploy, prod data, third-party)
- **E3.2** Replace pilot service secret with short-lived token or rotated secret
- **E3.3** Automate rotation for top 3 secrets (DB creds, API key, webhook secret)
- **E3.4** Add “leak response” playbook: revoke/rotate + audit search + redeploy

### Epic 4 — IAM Boundaries + OPA
- **E4.1** Map CI roles → permissions actually used (CloudTrail-driven narrowing)
- **E4.2** Create boundary roles per env (dev/stage/prod) with explicit denyrails
- **E4.3** OPA policies in CI: block IAM wildcards, public exposure, missing tags
- **E4.4** Step-up auth requirement for sensitive actions (WebAuthn/MFA where applicable)

## Concrete Tickets (Phase 1, 30-day window)
| ID | Title | Owner | Acceptance / DoD | CI/Policy Gate | Notes |
| --- | --- | --- | --- | --- | --- |
| T1 | Pilot selection + 1-page threat sketch | `platform-lead` + `pilot-owner` | Pilot chosen; data/egress/auth noted; non-prod deploy confirmed | — | Within Week 1 |
| T2 | Baseline CI security report job | `platform-lead` | Job outputs workflow permissions, pinned/unpinned actions, IAM roles, secret counts; artifact archived | — | Run nightly or on demand |
| T3 | Secret scanning + push protection org/repo | `security-lead` | Scanners enabled; test leak blocks push | **Gate:** secret scan step required on PR | Align with org policy |
| T4 | Add SBOM generation to pilot build | `pilot-owner` | SBOM artifact stored; linked to digest | **Gate:** build fails on SBOM generation error | CycloneDX |
| T5 | Add provenance attestation | `pilot-owner` | SLSA provenance uploaded; digest linked | **Gate:** build fails on provenance missing | Re-use builder support |
| T6 | Cosign sign + verify gate on deploy | `sre-lead` | Deploy blocks unless verify + verify-attestation succeed | **Gate:** `cosign verify` + `cosign verify-attestation` before deploy | Stage only |
| T7 | Minimal `permissions:` for deploy workflows | `platform-lead` | Deploy workflows define least-privilege permissions; audit log updated | **Gate:** workflow lints fail if missing minimal block | Deny by default |
| T8 | Pin actions by SHA (deploy first) | `platform-lead` | All deploy actions pinned; report lists remaining | **Gate:** lint fails on unpinned deploy actions | Use org reusable rule |
| T9 | Migrate pilot deploy to AWS OIDC | `platform-lead` + `sre-lead` | Deploy uses OIDC role; static keys removed from secrets | **Gate:** deploy job fails if static keys referenced | Attach least-privilege policy |
| T10 | Harden caches for privileged jobs | `platform-lead` | Cache keys scoped to branch+runner; no cross-branch reuse for privileged steps | — | Add cache lint |
| T11 | Freeze-window check in deploy job | `sre-lead` | Deploy blocks during freeze unless break-glass label present; logs approvals | **Gate:** policy check step | Pair with change calendar |
| T12 | Secret inventory + classify top 10 | `security-lead` | Inventory doc produced; ranks by blast radius | — | Feeds rotation picks |
| T13 | Rotate/replace 1 high-value pilot secret | `pilot-owner` + `security-lead` | Secret swapped for short-lived token/auto-rotated; rollback tested | **Gate:** deploy fails if old secret used | Target DB/API key |
| T14 | Rotation runbooks for top 3 secrets | `security-lead` | Runbooks validated in non-prod; time-to-rotate < 30 min | — | Include revoke + redeploy |
| T15 | CI IAM permission narrowing | `platform-lead` | CloudTrail-driven policy minimization applied to pilot role | **Gate:** OPA check rejects wildcards/out-of-scope resources | Stage-only boundary |
| T16 | OPA guardrails in CI for IAM + exposure | `security-lead` | Conftest/OPA step blocks IAM wildcards/public exposure/missing tags | **Gate:** policy test step required | Provide exception file |
| T17 | Step-up auth for sensitive actions | `platform-lead` | WebAuthn/MFA required for break-glass deploy/IAM changes; approvals logged | — | Coordinate with IdP |

## Implementation Order (Weeks 1–4)
1. Kickoff + pilot selection (T1), baseline CI report (T2), secret scanning/push protection (T3), break-glass definition (embedded in T11).
2. Build integrity: SBOM (T4), provenance (T5), cosign sign/verify wiring (T6).
3. CI hardening: permissions (T7), action pinning (T8), cache hardening (T10), freeze window (T11).
4. Identity/secrets: OIDC deploy (T9), secret inventory (T12), rotate pilot secret (T13), rotation runbooks (T14).
5. IAM boundaries/policy: permission narrowing (T15), OPA guardrails (T16), step-up auth (T17).

## Success Criteria and Evidence
- Stage deploy for pilot **fails** on missing or invalid signature/provenance.
- CI deploy uses OIDC with stage-scoped role; no static AWS keys configured.
- One high-value pilot secret replaced; rotation drill documented.
- Policy gates (OPA + minimal permissions + action pinning + secret scan) are enforced in CI.
- Exception/allowlist file exists with owner and expiry; approvals logged via break-glass path.

## Observability and Rollback
- Emit audit events for: cosign verify failures, policy violations, freeze-window blocks, break-glass use.
- Canary deploy path for pilot; automatic rollback on verify/policy failure.
- Store SBOM/provenance alongside build digest in artifact bucket with retention.

## Forward Look (Phase 2/3 hooks)
- Extend OPA policies to K8s admission and network/egress controls after pilot success.
- Add authZ regression tests and GraphQL guardrails (depth/complexity limits) in Phase 3.
