# ABI Schema

## Object Type Schema (example)

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "Person",
  "type": "object",
  "properties": {
    "id": { "type": "string" },
    "name": { "type": "string" },
    "dob": { "type": "string", "format": "date" }
  },
  "required": ["id", "name"]
}
```

## Action ABI (example)

```json
{
  "action": "link_person_to_org",
  "inputs": {
    "person_id": "string",
    "org_id": "string",
    "relationship": "string"
  },
  "effects": ["read", "write"],
  "preconditions": ["person_exists", "org_exists"],
  "postconditions": ["link_created"]
}
```

## ABI Generation Guarantees

- All action inputs validated against schemas.
- ABI versioning tied to ontology schema version.
- Client stubs emitted for orchestration and audit UIs.
