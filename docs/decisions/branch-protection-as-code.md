# Decision: Branch Protection as Code (BPAC)

## Decision

Enforce branch protection via repo policy, CI drift detection, and deterministic evidence outputs.

## Alternatives

- Manual GitHub settings: rejected (non-verifiable; drift-prone).
- Auto-apply by default: rejected for GA readiness (permission risk).

## Deferred

- Org-wide rollups and auto-apply automation are deferred pending least-privilege token approval.

## We Can Claim

- Branch protection drift is machine-verifiable from repo policy.
- Evidence artifacts are deterministic and audit-ready.

## We Cannot Claim

- Organization-wide enforcement across all repositories.
- Auto-apply protection without explicit authorization.
