# repo_assumptions.md

## Verified
- Repo: BrianCLong/summit exists and is MIT licensed. (source: GitHub UI)
- README references "Switchboard" as ingestion/normalization routing component (not MCP).

## Assumed (Deferred pending validation)
- Runtime: Node.js 18+, TypeScript, pnpm.
- Source layout: src/api/graphql, src/api/rest, src/agents, src/connectors, src/graphrag.
- CI workflows under .github/workflows/*.yml and scripts under .github/scripts/.

## Must-not-touch (until explicit ticket)
- Existing ingestion Switchboard implementation (naming collision)
- Production deployment manifests
- Provenance Ledger core schema (extend via additive fields only)

## Validation checklist (before merging PR2)
- Confirm actual src/ layout and test runner.
- Find existing "switchboard" directory (if any) and avoid name collision by using
  switchboard_mcp/.
- Confirm CI workflow names to hook new checks without breaking required gates.
