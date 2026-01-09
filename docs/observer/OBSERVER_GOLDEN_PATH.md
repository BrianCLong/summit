# Summit Observer Golden Path

## Who this is for

- OSINT analysts, intelligence operators, investigative journalists, and risk teams.
- Non-developers who can run Docker but do not want to learn the codebase.

## What you can do in 60–90 minutes

- Stand up a sandboxed Summit environment in observer mode.
- Run a structured IntelGraph investigation using a guided scenario.
- Export a shareable investigation brief to a local artifact folder.

## Single command startup (observer mode)

From the repo root:

```bash
make observer-up
```

The stack prints the primary endpoints:

- Frontend UI: http://localhost:3000
- GraphQL API: http://localhost:4000/graphql
- Neo4j Browser: http://localhost:7474
- Maestro API: http://localhost:8001/docs

To stop and clean up:

```bash
make observer-down
```

To verify the stack (UI + graph query):

```bash
make observer-smoke
```

## Guided session (end-to-end)

### 1) Start Summit in observer mode

```bash
make observer-up
```

Wait for the UI and API to report healthy. If needed, run:

```bash
make observer-smoke
```

### 2) Open IntelGraph UI & endpoints

- UI workspace: http://localhost:3000
- GraphQL API (read-only exploratory queries): http://localhost:4000/graphql
- Neo4j Browser (graph validation): http://localhost:7474
- Maestro API (pipeline context): http://localhost:8001/docs

### 3) Load a scenario

Use the guided scenario:

- `docs/observer/scenarios/SCENARIO_competitive_landscape_example.md`

The scenario points to local fixture data in `GOLDEN/datasets/` and avoids any external connectors.

### 4) Run 1–2 guided investigations

Follow the scenario steps to:

1. Open the IntelGraph workspace.
2. Run the provided queries/panels.
3. Capture outputs (entity lists, relationships, and metrics).

### 5) Export a brief

1. Copy the investigation template:
   - `docs/observer/INTELGRAPH_INVESTIGATION_TEMPLATE.md`

2. Fill it in and save locally (example: `docs/observer/scenarios/INVESTIGATION_competitive_landscape_brief.md`).

3. Export with the helper:

```bash
node scripts/observer/export_brief.mjs docs/observer/scenarios/INVESTIGATION_competitive_landscape_brief.md \
  --dataset-id GOLDEN/datasets/sum_news.jsonl \
  --tag observer
```

If you do not have Node installed, use Docker instead:

```bash
docker run --rm -v "$PWD":/work -w /work node:20-alpine \
  node scripts/observer/export_brief.mjs docs/observer/scenarios/INVESTIGATION_competitive_landscape_brief.md \
  --dataset-id GOLDEN/datasets/sum_news.jsonl \
  --tag observer
```

The brief will be written to:

- `artifacts/observer/briefs/BRIEF_<slug>_<timestamp>.md`
- `artifacts/observer/briefs/BRIEF_<slug>_<timestamp>.json`

## Guardrails & governance alignment

- Observer mode is read-only by default: no external data-plane connectors are enabled.
- Local fixture data is used for demos and training.
- Governance posture is asserted in `docs/SUMMIT_READINESS_ASSERTION.md`.

## Future work (intentionally constrained)

- Add a UI-side “Export brief” button that serializes selected entities and query context into a
  file consumed by `scripts/observer/export_brief.mjs`.

## Next steps

- Review the investigation template: `docs/observer/INTELGRAPH_INVESTIGATION_TEMPLATE.md`.
- Try additional datasets from `GOLDEN/datasets/`.
- Share the exported brief with your team.
