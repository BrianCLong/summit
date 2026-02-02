# Repo Assumptions (Narrative Intelligence Subsumption)

## Verified (Local Inspection)
- `docs/security/` and `docs/ops/runbooks/` exist and are active documentation surfaces.
- Feature flags are documented under `docs/FEATURE_FLAGS.md` and related docs.
- Playwright configuration exists in the repo root (`playwright.config.ts`).

## Deferred Pending Verification
- Exact service runtime locations for narrative analytics modules.
- CI check names and required gates for narrative intelligence changes.
- Existing evidence schema naming and signing conventions used by runtime services.

## Must-not-touch
- Existing workflows unless a new job file is explicitly required.
- Security policy files under `docs/security/` outside this narrative data-handling scope.
- Production connectors without tenant-level gating and explicit approvals.

## Validation Plan (Before PR-1 Merge)
- Locate feature flag evaluation path and tenant allowlist controls.
- Confirm centralized logging/audit pathways for evidence packs.
- Identify artifact naming conventions and hash signing flows.
- Confirm API patterns (REST/GraphQL/WebSocket) and endpoint ownership.
