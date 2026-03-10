# Repo Reality Check — fsociety Subsumption

## Verified in Current Repository

- `subsumption/` exists and is used for itemized subsumption bundles.
- Bundle template files exist at `subsumption/_template/manifest.yaml` and `subsumption/_template/claims.md`.
- Root-level governance references include `AGENTS.md`, `agent-contract.json`, and policy/evidence directories.

## Intentionally Constrained (Deferred Pending Follow-Up)

- Exact CI workflow check names tied to this lane are deferred pending direct pipeline mapping.
- Existing evidence schema constraints are deferred pending schema coupling review.
- Runtime adapter path for external tools is deferred; this bundle is metadata-only.

## Must-Not-Touch Areas for Follow-On PRs

- Global OPA deny/allow semantics without explicit governance countersign.
- Existing evidence validator contracts unless schema versioning is explicitly updated.
- Branch protection policy sources and check reconciliation automation.

## Next Validation Step

Map this bundle to existing CI check definitions before any policy or runtime integration PR is opened.
