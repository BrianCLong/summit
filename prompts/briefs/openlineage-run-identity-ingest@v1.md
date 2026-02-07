# Prompt: OpenLineage Run Identity + Batch Emission ITEM Ingest

## Objective

Capture the OpenLineage 1.43.x update (UUIDv7 run identity + batch emission + new facets) and translate it into a Summit-ready ingest brief with grounded sources, integration plan, risk register, and PR stack.

## Required Outputs

- `docs/briefs/openlineage-run-identity-ingest.md` with:
  - Evidence-first UEF section listing sources.
  - Verifiable claims, assumptions, relevance scoring, and risk register.
  - Integration strategy (adopt vs build), PR stack, and Go/No-Go gates.
  - Governance, security, compliance defaults and MAESTRO alignment.
  - Finality section that dictates next steps.
- Update `docs/roadmap/STATUS.json` with a new in-progress initiative for OpenLineage run identity + batch emission.

## Constraints

- Cite the Summit Readiness Assertion.
- Avoid uncertainty language; use deterministic phrasing ("Deferred pending X" if needed).
- Keep scope within documentation only.

## Scope

- `docs/briefs/openlineage-run-identity-ingest.md`
- `docs/roadmap/STATUS.json`
- `prompts/briefs/openlineage-run-identity-ingest@v1.md`
- `prompts/registry.yaml`
