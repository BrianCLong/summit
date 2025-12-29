# Schema Compatibility Guard

This tool compares JSON/YAML schemas between a baseline directory and the working tree, flagging breaking changes unless a major version bump or an explicit compatibility map is provided. Breaking rules:

- Removing required fields or required properties.
- Narrowing types (including shrinking a union).
- Removing enum values.
- Changing semantic tags (classification/semantic metadata).

## Usage

```
node scripts/schema-compat/cli.mjs \
  --baseline <path-to-baseline-schemas> \
  --current <path-to-current-schemas> \
  --report schema-compat-report.md \
  --compat scripts/schema-compat/compatibility-map.json
```

The report is human-readable Markdown that can be uploaded as a CI artifact. Breaking changes are permitted only when either:

- The specific schema's `x-version` has a higher **major** value than the baseline, or
- The change is explicitly allow-listed in the compatibility map (optionally scoped by file name).

Run `node scripts/schema-compat/check-fixtures.mjs` to validate the additive and breaking fixtures against their stored reports.

## Compatibility map format

```json
{
  "allow": [
    {
      "code": "required.removed",
      "file": "user.schema.json",
      "path": "email",
      "rationale": "Removed in v2 with compensating migration"
    }
  ]
}
```

Compatibility entries can optionally omit `file` to apply to any schema, or set it to a specific schema filename to avoid
collisions when multiple schemas share the same property names.

## Fixture scenarios

- `fixtures/additive`: Adds an optional field (should pass).
- `fixtures/breaking`: Removes a required field, narrows types, adjusts semantics (should fail without version bump or allow-list).
- `fixtures/expected`: Snapshot reports generated from the above fixtures.
