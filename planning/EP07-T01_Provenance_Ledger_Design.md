# EP07-T01 Provenance Ledger Design

## Concept
An immutable, append-only ledger that records every mutation to the graph.

## Data Structure (Aligned with `canonical.graphql`)

```json
{
  "id": "uuid",
  "timestamp": "ISO8601",
  "actor": "user_or_service_id",
  "action": "INGEST | TRANSFORM | MERGE | SPLIT",
  "inputs": ["source_entity_hash_1", "source_entity_hash_2"],
  "outputs": ["target_entity_hash"],
  "method": "algorithm_or_connector_name",
  "parameters": { "confidence": 0.95 },
  "signature": "cryptographic_signature_of_content",
  "prev_hash": "hash_of_previous_entry"
}
```

## Storage
1.  **Hot Storage**: Postgres `provenance_events` table (for querying via GraphQL).
2.  **Cold Storage**: S3 `provenance-ledger/` bucket (JSON lines, daily batches).
3.  **Verification**: Hash chain verification runs nightly.

## Integration Points
*   **Ingest**: Connectors generate `INGEST` events.
*   **ER**: Resolution pipeline generates `MERGE`/`SPLIT` events.
*   **API**: Mutations generate `TRANSFORM` events.
*   **UI**: Provenance Viewer visualizes the `inputs` -> `outputs` graph.
