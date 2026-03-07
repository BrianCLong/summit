# Cross-Repository Dependency Governance (Phase 1)

This document defines how IntelGraph and adjacent repos exchange code and contracts. Phase 1 focuses on establishing the map, policies, and automation to flag likely cross-repo impact for 2–3 critical links.

## Scope and intent

- **Source-of-truth repos:**
  - `intelgraph-platform` (this repo) for GraphQL schema, policy bundles, and shared TypeScript domain types.
  - `ga-graphai` for cognitive graph algorithms consumed by the platform runtime.
- **Consumer repos:**
  - `intelgraph-studio` (customer-facing UI and analyst tooling).
  - `prov-ledger-service` (ledger/event sink for compliance and replay).
- Future repos must be added to the manifest before introducing new runtime dependencies.

## Allowed dependency directions

- Platform contracts flow **outward**: consumers may depend on APIs, schemas, or shared libraries published by `intelgraph-platform`; reverse dependencies are not allowed.
- `ga-graphai` may depend on platform domain types, but platform services should only consume stable `ga-graphai` packages (no ad-hoc imports from its internal modules).
- UI repos (`intelgraph-studio`) consume APIs and generated clients only; no direct server module imports.
- Ledger/analytics repos (`prov-ledger-service`) consume emitted event schemas and policy bundles only.

## Versioning and pinning policy

- **APIs/GraphQL:** Semantic versioned tags on published API/GraphQL clients. Breaking changes require a **major** bump and release notes in the PR description.
- **Shared libraries:** Pinned via workspace or exact semver ranges (e.g., `^1.2.0`). Consumers must not track `main` directly unless explicitly declared in the manifest.
- **Schemas/Contracts:** Each schema change increments a schema revision file and is documented in `governance/exported-interfaces.json`. Downstream repos pin to a revision or release tag.
- **Experimental integrations:** Allowed only behind feature flags with explicit `expires_on` metadata in the manifest entry.

## Governance workflow

1. Update `governance/cross-repo-map.yml` when adding/changing a cross-repo dependency.
2. Update `governance/exported-interfaces.json` when exposing or deprecating public surfaces.
3. Run the change impact analyzer locally (`pnpm exec ts-node scripts/architecture/analyze-cross-repo-impact.ts --base-ref origin/main`) to review downstream ripple effects.
4. CI posts advisory comments on PRs (non-blocking) summarizing impacted repos and the breaking/non-breaking guess.

## Breaking-change guidance

- Treat changes to GraphQL schema, OpenAPI specs, public TypeScript types under `packages/**`, and policy bundles as **potentially breaking**.
- Add migration notes and recommended client bumps to the PR body when a breaking change is detected.
- Prefer additive changes; removals/renames require a coordinated release with consumer repos.

## Phase 1 focus areas

- IntelGraph platform contracts → `intelgraph-studio` UI.
- Event/policy schema changes → `prov-ledger-service`.
- Algorithmic library updates → `ga-graphai` packages consumed by platform services.

Future phases will expand coverage to additional repos and enforce blocking gates once stability and mapping accuracy are validated.
