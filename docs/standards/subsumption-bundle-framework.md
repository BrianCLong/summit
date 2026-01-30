# Subsumption Bundle Framework Standard

## Purpose

Define how external ITEMS are converted into Summit-native, gated PR stacks with deterministic evidence.

## Bundle Layout

- `subsumption/<item-slug>/manifest.yaml`
- `docs/standards/<item-slug>.md`
- `docs/security/data-handling/<item-slug>.md`
- `docs/ops/runbooks/<item-slug>.md`
- `evidence/index.json` + schemas
- Policy fixtures (deny-by-default)

## Import/Export Matrix

- Import: ITEM excerpts, API docs, benchmark notes (human)
- Export: manifest, evidence bundle, gates, eval outputs (machine)

## Non-goals

- No runtime feature changes without ITEM content and explicit PR scope.
- No bypass of governance gates or evidence determinism rules.

## Compatibility Notes

- Designed to coexist with existing Summit governance gates.

## Claim-safe Messaging

- Summit enforces deterministic governance bundles in CI for subsumption intake.
- Summit blocks merges when required docs, evidence schemas, or deny-by-default fixtures are missing.
- Summit provides auditable evidence bundles mapping IDs to artifacts.
- Do not claim runtime feature parity for an ITEM until its bundle is populated and verified.
