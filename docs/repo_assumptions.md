# Repo Assumptions Ledger (Subsumption Engine v4)

## Verified (conversation-derived)
- Deterministic evidence and GA governance gates are priorities.
- CI scripts exist under scripts/ci and are used to enforce policies.

## Assumed (validate in repo)
- Node 20+ / pnpm workspace setup.
- GitHub Actions workflows run scripts under scripts/ci.
- evidence/ directory either exists or can be introduced safely.

## Must-not-touch (blast radius)
- Core runtime packages and public APIs unless required for gating.
- Existing workflow logic beyond adding a new job hook.
- Security-sensitive config unless required for verifier integration.

## Validation Plan
- Identify required checks from branch protection settings (UI/API).
- Confirm existing evidence conventions and align schemas to avoid drift.
