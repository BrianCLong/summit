# Entity Canonical Model

Defines the normalized structure for entities and relationships extracted from raw connector output.

- `entity_id`: A deterministic hash based on the entity type and canonical name.
- `valid_time`: A temporal span `[start, end)` representing when the entity or relationship was observed to be valid in the real world.
