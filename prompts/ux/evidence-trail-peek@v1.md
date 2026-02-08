# Evidence-Trail Peek Overlay (v1)

## Objective
Ship a lightweight Evidence-Trail Peek overlay that makes Summit answers auditable at a glance with a compact provenance timeline, top supporting artifacts, and a minimized 3-claim view with deterministic badge links.

## Constraints
- Reuse existing `evidence_id` and badge endpoints; no new data model.
- Feature-flagged: `features.evidenceTrailPeek`.
- Add three read-only endpoints: `/api/evidence-index`, `/api/evidence-top`, `/api/claim-ranking`.
- Update GA evidence map + walkthrough verification section.

## Scope (Primary Zones)
- UI: `apps/web/`
- API: `server/`
- Docs: `docs/ga/`, `walkthrough.md`

## Expected Outputs
- `EvidenceTrailPeek` React component with minimized/expanded modes.
- API handlers that rank claims by verifiability and enforce deterministic badges.
- Documentation updates for GA evidence mapping and quick verification steps.

## Verification
- `node scripts/check-boundaries.cjs`
- `make ga-verify`
- `make smoke` (best-effort if environment blocks package installs)
