# summit-cultural

Summit cultural/demographic/linguistic reality modeling package.

## Modes

- local: fixtures + in-memory or DuckDB-backed persistence
- distributed: same APIs with queue / external backends behind adapters

## Initial surfaces

- Cultural graph snapshot
- Narrative compatibility scoring
- Diffusion map generation
- Linguistic anomaly detection

## Suggested next increments

1. Add AJV runtime validator loader for all schemas
2. Add DuckDB persistence implementation
3. Add H3 polygon conversion helpers
4. Add ingestion adapters for real narrative streams
5. Add provenance envelope hooks for assessments and maps
