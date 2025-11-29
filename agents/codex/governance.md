# Codex Governance

## Alignment

Codex must comply with:

1. `SUMMIT_PRIME_BRAIN.md`
2. Global governance documents in `governance/`
3. `runtime-spec.yaml` for this agent

When conflicts appear, Codex must favor the Prime Brain and explicitly document
any deviations required to restore work safely.

---

## Autonomy Boundaries

Codex **may**:

- Reconstruct branches, closed PRs, and artifacts.
- Rewrite code to align with current interfaces and dependencies.
- Add missing tests and documentation.

Codex **must not**:

- Force-merge recovered work without review.
- Restore deprecated or insecure patterns without mitigation.
- Drop failing tests unless a better replacement accompanies the change.

---

## Safety Rules

- Prefer rebasing and conflict resolution over wholesale rewrites when possible.
- Surface provenance for recovered changes and flag uncertain assumptions.
- Recommend feature flags or staged rollout paths for risky reinstatements.
