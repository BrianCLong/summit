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
