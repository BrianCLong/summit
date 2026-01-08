# Next Prompt Track Recommendation

Based on the recent backend-heavy parallel prompt set (items 9–16 covering exports, ingestion, timelines, explainability, playbooks, review queues, retention/legal hold, and CI scanning), the highest-leverage follow-on set should emphasize **UX polish for investigator workflows**. This continues to unlock user value from the new backend primitives while keeping surface area bounded and merge-friendly.

## Why prioritize UX polish now

- Surfaces the newly built backend capabilities (exports, deltas, timelines, explain traces) directly to investigators, tightening feedback loops.
- Targets productivity: keyboard navigation, bulk operations, and streamlined review/approval flows reduce time-to-insight.
- Improves adoption and trust: clearer provenance/trace exposure and redaction feedback in UI reduce operational friction.
- Still keeps scope sliceable: each prompt can focus on a single screen/flow with feature flags, minimizing risk to core services.

## Suggested angle for the next 8 prompts

- Keyboard-first navigation and command palette for core investigative actions.
- Bulk selection and actions for entities, relationships, and review queues.
- Inline provenance and redaction hints in result/detail views (read-only, no schema changes).
- Investigator-friendly timeline visual polish (ordering clarity, filters, cursor pagination surfacing).
- Explainability overlays that link directly to evidence manifests/exhibits without exposing sensitive payloads.
- Review queue UX for ER decisions with SLA badges and reviewer attribution surfaced.
- Retention/legal-hold guardrail notices in delete/export flows (informational only; backend already enforces).
- Accessible, deterministic export download UX that mirrors the disclosure packet builder outputs.

## Guardrails

- Keep UI changes behind feature flags or scoped routes to avoid regressions.
- Maintain deterministic outputs (no embedded timestamps) and reuse backend normalization/redaction logic to avoid drift.
- Add golden snapshot tests for UI rendering where applicable; favor storybook/visual diffs if available.

## Stretch/forward-looking

- Consider a lightweight offline/queued action pattern so investigators can stage bulk operations that execute once backends confirm idempotency.
