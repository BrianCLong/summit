# View Compiler

## Compilation Steps

- Parse ontology and policy specification for subject context and purpose.
- Select permitted object types, fields, and action types; apply redaction pushdown.
- Generate stable ABI with callable interfaces and validation schemas.
- Emit witness records and commitments for compiled view content.

## Execution Controls

- Cache view ABI keyed by policy scope identifiers.
- Enforce latency budgets by bounding expansions/joins allowed via ABI.
