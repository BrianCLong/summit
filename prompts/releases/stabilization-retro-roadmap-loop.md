# Prompt: Stabilization Retrospective → Roadmap Handoff Loop

You are an agent implementing the stabilization retrospective and roadmap handoff loop. Deliver a
monthly, fully automated flow that:

1. Generates a deterministic stabilization retrospective from weekly closeout artifacts.
2. Emits a deduplicated set of roadmap candidate drafts using rule-based thresholds.
3. Defaults to draft-only mode, with issue creation gated behind policy.

Constraints:

- No product feature work.
- Recommendations are derived from metrics only.
- Cap outputs to at most five candidates per month.
- Use stable slugs for dedupe markers.

Deliverables:

- scripts/releases/generate_stabilization_retrospective.mjs
- scripts/releases/derive_stabilization_roadmap_candidates.mjs
- scripts/releases/sync_stabilization_roadmap_handoff.mjs
- .github/workflows/stabilization-retrospective.yml
- release-policy.yml updates
- docs/releases/STABILIZATION_RETROSPECTIVE.md
- docs/releases/STABILIZATION_ROADMAP_HANDOFF.md
- sample artifacts under artifacts/stabilization
