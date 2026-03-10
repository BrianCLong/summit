<<<<<<< HEAD
1. **Define Schema for Moments**
   - Create `summit/memory/moment.py` containing a `Moment` dataclass/Pydantic model.
   - Schema should include: `timestamp`, `source_app`, `uri`, `title`, `text`, `metadata`, `sensitivity_tags`, `hash`, and an `id`.

2. **Ingestion Endpoint & Capture Adapter**
   - Create `summit/memory/ingestion.py` which exposes an ingestion function (or class) to capture moments.
   - It will normalize input into the `Moment` schema.

3. **Hybrid Retrieval (Vector + Graph)**
   - Create `summit/memory/retrieval.py` for hybrid retrieval.
   - Mock integration with Qdrant (using a simple dictionary/list or mocking the `VectorSearch` class) and Neo4j (using a simple dictionary/list or mock graph).
   - Ensure the retrieval function accepts a query and returns moments with their citations.

4. **Evidence Citations**
   - Ensure retrieved moments format properly as evidence with source, timestamp, app, uri.

5. **Policy Controls**
   - Implement policy filters in the ingestion and/or retrieval layer. Exclude domains, apps, handle sensitive fields.

6. **Tests and Validation**
   - Create `tests/summit/memory/test_ambient_memory.py` to verify ingestion, retrieval, and policy controls.
=======
1. **Explore the codebase**: Check for existing implementations related to `maestro`, `intelgraph`, `evidence`, `policy`.
2. **Draft Documentation**: Create `docs/repo_assumptions.md`, `docs/standards/epistemic-assurance-plane.md`, `docs/ops/runbooks/epistemic-assurance-plane.md`, and `docs/security/data-handling/epistemic-assurance-plane.md`.
3. **Define API Schemas**: Create JSON schemas for `EpistemicClaim`, `EpistemicEvidence`, `ProvenanceStep`, `EpistemicPolicy`, and `EpistemicDecision` in `api-schemas/epistemic/`.
4. **Define Graph Schemas**: Create Python Pydantic models in `intelgraph/schema/epistemic.py`.
5. **Implement Maestro Policy Engine**: Implement `evaluateEpistemicIntent` in `services/maestro-orchestrator/src/epistemic.ts`.
6. **Implement Test Cases**: Write unit tests for Maestro Policy Engine in `services/maestro-orchestrator/tests/epistemic.test.ts` and `epistemic-abuse.test.ts` using abuse case fixtures.
7. **Implement Monitoring/Assurance Tools**: Add `scripts/monitoring/epistemic-assurance-drift.ts` and deterministic tests `tests/epistemic/epistemic-determinism.test.ts`.
8. **Verify All Tests Pass**: Run `npx tsx --test` for Maestro and Epistemic determinism tests.
9. **Commit Changes**: Proceed with pre-commit checks and submission.
>>>>>>> origin/main
