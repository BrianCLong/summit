# Copilot Model Preview Governance Lane-1

## Objective

Establish lane-1 governance artifacts for Copilot model previews, including evidence scaffolding, catalog metadata, deny-by-default policy tests, GA checklist updates, and CI verification gate wiring.

## Scope

- Evidence scaffolding and index updates under `evidence/`.
- Copilot model catalog and policy module under `src/`.
- Governance + GA documentation under `docs/governance/` and `docs/ga/`.
- CI verification workflow + script under `.github/`.
- Required checks discovery note updates.
- Roadmap status updates.

## Constraints

- Encode only public operational facts.
- No new npm dependencies.
- Deny-by-default for unknown premium multipliers during promo windows.
- Evidence artifacts must isolate timestamps to `stamp.json`.

## Verification Targets

- `node .github/scripts/verify-evidence.mjs`
- `pnpm test`
- `make ga-verify`
- `scripts/check-boundaries.cjs`

## Outputs

- Evidence IDs: `EVD-CLAUDEOPUS46FAST-CATALOG-001`, `EVD-CLAUDEOPUS46FAST-COST-002`, `EVD-CLAUDEOPUS46FAST-GATES-003`.
- GA checklist entry for Copilot model previews.
- Catalog record for `anthropic/claude-opus-4.6-fast`.
