# Semantic PII Ontology Mapper (SPOM)

SPOM maps schema fields to the platform's PII ontology. It blends high-signal
rules with a lightweight embedding stub to assign sensitivity, category, and
jurisdiction tags, emitting confidence scores and human-readable explanations.

## Features

- Deterministic rule engine that recognises naming patterns and sample values.
- Embedding stub that estimates semantic similarity to ontology concepts.
- Confidence scoring that fuses rule hits and semantic evidence.
- Diff reporter that highlights tag changes across schema revisions.
- FSR-PT plug-in that annotates registry schemas with ontology tags.

## Usage

```python
from spom.mapper import SPOM, FieldObservation

mapper = SPOM()
fields = [
    FieldObservation(name="email_address", sample_values=["user@example.com"]),
]
report = mapper.map_fields(fields)
```

See `tests/` for end-to-end examples with expected outputs.
