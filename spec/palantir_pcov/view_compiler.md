# View Compiler

## Compiler Inputs

- Ontology schema (types, fields, actions).
- Policy-as-code bundle with subject + purpose context.
- Redaction rules and disclosure budgets.

## Compilation Steps

1. Resolve permitted object types.
2. Filter fields and actions by policy.
3. Push down redaction rules to view materialization.
4. Emit ABI schemas and validation rules.

## Output Artifacts

- Compiled view JSON schema.
- ABI definition with method signatures.
- Compatibility map for schema evolution.
