# Persona Contract

A Persona Contract defines the bounded personality of an assistant.

## Fields
- `persona_id`: Unique identifier.
- `version`: Semantic version.
- `allowed_style_axes`: Allowed variations (e.g., "humor": ["dry", "witty"]).
- `forbidden_axes`: Traits strictly disallowed (e.g., "coercion").

## Validation
Contracts must be validated at startup. Forbidden axes are enforced by code.
