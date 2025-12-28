# Cross-Stack Graduation Specification (Unified Lifecycle)

## Purpose

Summit uses a single, organization-wide graduation model for **both frontend and backend**.
No capability can graduate on one side of the stack without the other. Graduation is a **stack-level
decision** with shared evidence and shared approvals.

## Unified Lifecycle States (Single Source of Truth)

All artifacts, claims, and contracts use the same lifecycle state:

- **Experimental**: Flagged, isolated, non-default exposure. No GA claims.
- **GA-Adjacent**: Production-like exposure under explicit gates and evidence.
- **GA**: Fully production-ready with locked contracts and operational readiness.

**Rule**: Frontend and backend must declare the same lifecycle state for a capability.

## Cross-Stack Promotion Gates

### Experimental → GA-Adjacent (Cross-Stack)

Promotion requires **both** sides to satisfy the gates below. If either side fails, promotion is
blocked.

**Frontend**

- Flagged, isolated UI
- Claim & semantics audit
- Golden-path compatibility
- Demo-safety verification

**Backend**

- Read-only or clearly bounded write paths
- API stability guarantees
- Performance and error budgets defined
- Security & access controls reviewed

**Joint**

- Shared hypothesis & success criteria
- End-to-end journey validation
- No GA contract violations
- Unified promotion approval

### GA-Adjacent → GA (Cross-Stack)

Promotion requires **both** sides to satisfy the gates below.

**Frontend**

- Updated golden-path contracts
- Exposure mode parity
- No experimental affordances remaining

**Backend**

- API contracts locked
- Backward compatibility guarantees
- Operational readiness confirmed

**Joint**

- End-to-end SLO compliance
- Compliance / governance sign-off
- Documentation parity (frontend + backend)
- Versioned release artifact

## Evidence Bundle (Required for Promotion)

Every promotion decision must include a **versioned evidence bundle** retained for audit.
The evidence bundle is the single, reviewable record of maturity alignment.

Required evidence items:

- Lifecycle declaration (frontend + backend, single source of truth)
- Frontend contracts & tests
- Backend API contracts & tests
- Performance and reliability metrics
- Security / compliance attestations
- Demo exposure verification
- Joint approval record

**Storage**: Evidence bundles must live in-repo under `evidence/graduation/` or be a versioned
artifact linked from the PR.

## Repo & CI Enforcement

- Lifecycle state **must** be declared in PRs for both frontend and backend.
- CI **blocks** mismatched states (e.g., frontend GA-Adjacent + backend Experimental).
- Promotion requires explicit, recorded joint approval.
- PRs must link a versioned evidence bundle for any promotion intent.

Automation is mandatory; documentation alone is insufficient.

## Ownership & Decision Rights

- **Lifecycle owners**: Cross-Stack Graduation Systems Owner (final arbiter), plus the
  designated Frontend DRI and Backend DRI.
- **Conflict resolution**: Default to the **least mature** state until evidence converges.
- **Escalation**: Governance Council → Meta-Governance Framework (see
  `docs/governance/META_GOVERNANCE.md`).
- **Emergency downgrade**: Requires joint frontend + backend approval and immediate evidence
  update in the graduation bundle.
