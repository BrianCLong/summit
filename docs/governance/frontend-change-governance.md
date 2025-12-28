# Frontend Change Governance (MVP-3-GA)

## Purpose

This policy establishes the permanent intake, classification, review, and enforcement system for
frontend changes. It ensures all UI work is gated, reviewable, and incapable of silently degrading
trust, accuracy, or compliance.

**Canonical enforcement**: `policies/rego/frontend-governance.rego` (OPA) and
`.github/workflows/frontend-governance.yml` (CI gate).

## A. Change Classification Model

All frontend PRs must declare **one** change class.

| Class                                    | Description                                              | Required reviewers                            | Required approvals (labels)                                                                | Required tests                       | GA-locked files allowed?                     |
| ---------------------------------------- | -------------------------------------------------------- | --------------------------------------------- | ------------------------------------------------------------------------------------------ | ------------------------------------ | -------------------------------------------- |
| **0 — Non-Functional**                   | Comments, refactors, tooling, formatting                 | Frontend codeowners                           | `frontend/governance-approved` if GA-locked touched                                        | Unit tests or lint (if relevant)     | **Yes**, with governance label               |
| **1 — Visual / Cosmetic**                | Styling, layout, spacing, accessibility improvements     | Frontend codeowners                           | `frontend/governance-approved` if GA-locked touched                                        | UI snapshot or targeted UI tests     | **Yes**, with governance label               |
| **2 — Behavioral (Non-Claim)**           | UX flows, interaction logic, performance                 | Frontend codeowners + UX reviewer             | `frontend/governance-approved`                                                             | Targeted unit/integration tests      | **Yes**, with governance label               |
| **3 — Claim / Semantic**                 | Copy, labels, metrics, dashboards, representations       | Frontend codeowners + Governance reviewer     | `frontend/governance-approved`, `compliance/claims-approved`                               | Targeted tests + validation note     | **Only** with governance + claims labels     |
| **4 — Governance / Compliance Relevant** | Autonomy-adjacent UI, compliance views, decision framing | Frontend codeowners + Governance + Compliance | `frontend/governance-approved`, `compliance/claims-approved`, `compliance/ethics-approved` | Targeted tests + governance sign-off | **Only** with governance + compliance labels |

**GA-locked** means the surface is covered by `docs/governance/frontend-ga-locked-registry.md`.
**Frozen** surfaces require `frontend/emergency-exception` and are limited to emergency fixes.

## B. Frontend Intake & PR Gating

### Required PR Intake Fields

All frontend PRs must include the “Frontend Governance Intake” section (see
`.github/PULL_REQUEST_TEMPLATE/frontend-change-governance.md`). The following fields are mandatory:

- Change class (0-4)
- Risk level (low/medium/high)
- Affected surfaces
- GA-locked files touched? (yes/no)
- Feature flag or safe-staging plan

### Automated Enforcement

CI **blocks** frontend PRs that:

- Omit classification or risk declarations
- Touch GA-locked files without the required label(s)
- Touch frozen surfaces without an emergency exception
- Modify claim-bearing surfaces (Class 3/4) without compliance labels

**Policy-as-code** enforcement is implemented in:

- `policies/rego/frontend-governance.rego`
- `policies/rego/data/frontend-governance.json`

The workflow `.github/workflows/frontend-governance.yml` evaluates the policy on every PR.

## C. GA-Locked Surface Registry

The definitive registry lives in:

- `docs/governance/frontend-ga-locked-registry.md` (human-readable)
- `policies/rego/data/frontend-governance.json` (machine-readable)

Any change to GA-locked or frozen surfaces must update both files and requires governance review.

## D. Future Feature Staging Rules

Future frontend work must **not** ship by default. All unfinished UI must be isolated via one of:

1. **Feature flags**
   - Must be declared in PR intake.
   - Must have an owner, removal date, and default-off state.
   - Must be audited in `apps/web/src/config` or equivalent feature flag registry.

2. **Branch isolation**
   - Demo-only branches must not merge to `main`.
   - Branch names must be `feat/<scope>/<desc>` and include an expiration.

3. **Demo-only builds**
   - UI prototypes must live under `/demo` or `/mocks` and be excluded from production bundles.
   - Any demo routes must be gated and **not** registered in production routing.

No “temporary” exceptions. Every staged artifact must be reversible without touching GA-locked
surfaces.

## Examples

**Compliant Class 1**

- Update spacing in `apps/web/src/components/`.
- PR declares Class 1, risk low, surfaces listed.
- Adds `frontend/governance-approved` label if GA-locked paths touched.

**Non-Compliant**

- Change to `apps/web/src/pages/ReportsPage.tsx` without `frontend/emergency-exception`.
- PR missing risk level or change class.
- Copy change in a dashboard without `compliance/claims-approved`.

## Change Log

- MVP-3-GA governance reboot: initial policy and enforcement gates.
