# E2E Test Plan — Ingest to Report

## Goal
Validate that seeded data flows from ingest through NL→Cypher preview to exportable report with provenance and cost guard annotations.

## Preconditions
- Demo data generated with `python scripts/generate_demo_data.py --seed 42`.
- Preview service pointing to Neo4j sandbox seeded with fixture graph.
- Provenance ledger and cost guard services reachable in sandbox.

## Steps
1. **Ingest entities/relationships:** POST fixture batch from `demo_data/entities.jsonl` and `relationships.jsonl` to ingest API.
2. **Run NL prompts:** Execute curated prompts (10) and capture preview responses including explainability.
3. **Select candidate & execute:** Choose top-ranked Cypher; run against sandbox; store results.
4. **Export provenance:** Trigger ledger export for the run and verify manifest checksum.
5. **Generate report:** Render tri-pane report including NL prompt, chosen Cypher, policies applied, and ledger export hash.
6. **Validate cost guard:** Replay usage with `--kind usage` fixtures; confirm alerts/blocks align with policies.

## Success Criteria
- 100% of prompts return ≤400 ms median latency.
- Accuracy ≥95% on curated fixtures.
- Provenance export verifies with zero hash chain errors.
- Cost guard alerts for injected overage; block rate ≥80% on adversarial scenario.

## Artifacts
- Logs, screenshots, and verification hashes stored under `tests/e2e/artifacts/{date}`.
