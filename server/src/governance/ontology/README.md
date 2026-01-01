
# Ontology Execution Engine

This module provides the runtime capabilities for the Ontology Engine v2.

## Components

### OntologyExecutionService

The core service that allows agents and systems to:
* **Validate**: Check data against the active ontology schema.
* **Infer**: Derive new assertions based on confidence and simple rules.
* **Project**: Filter assertions based on temporal validity.
* **Explain**: Provide provenance for assertions.

### SchemaRegistryService

Manages the lifecycle of ontology schemas (Draft -> Active -> Deprecated).

### Policy Governance

Ontology mutations (Schema creation/approval) are governed by OPA policies defined in `policy/ontology.rego`.

## API Usage

### Validate Data
POST `/api/ontology/validate`
```json
{
  "entityType": "Person",
  "data": { "fullName": "Alice" }
}
```

### Infer Assertions
POST `/api/ontology/infer`
```json
{
  "assertions": [ ... ]
}
```

### Create Schema (Requires `ontology_editor` role)
POST `/api/ontology/schema`

### Approve Schema (Requires `ontology_approver` role)
POST `/api/ontology/schema/:id/approve`

## Models

* **TemporalScope**: `validFrom`, `validTo`
* **ProbabilisticMetadata**: `confidence`, `source`
