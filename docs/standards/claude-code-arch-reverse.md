# Claude-Code Architecture Reverse Standard

## Import sources

- OpenAPI specs (`openapi*.json|yaml`) are the authoritative endpoint catalog.
- AWS Step Functions definitions (`*.asl.json`) provide workflow terminal-event truth.
- Static repository files are scanned offline only; network access is intentionally constrained.

## Export artifacts

- `docs/architecture/flows/index.md`
- `docs/architecture/flows/flows.json`
- `docs/architecture/flows/verification.json`
- `docs/architecture/flows/flows/<flow-id>/diagram.mmd`
- `.summit/context/flows.pack.json`

## Non-goals (v1)

- Runtime traces or APM ingestion.
- Perfect semantic domain modeling.
- Cross-network source code ingestion.
