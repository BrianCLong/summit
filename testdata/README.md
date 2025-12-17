# Test Data Directory

This directory contains test fixtures and oracle scenarios for validating IntelGraph functionality.

## Structure

```
testdata/
├── README.md                      # This file
└── intelgraph/
    └── oracle-scenarios.json      # Graph Query Oracle scenarios
```

## IntelGraph Oracle Scenarios

The `intelgraph/oracle-scenarios.json` file contains the test scenarios for the Graph Query Correctness Oracle.

### Running the Oracle

```bash
# Run all scenarios
pnpm oracle:graph

# Run with verbose output
pnpm oracle:graph:verbose

# Run specific scenario
pnpm oracle:graph -- --scenario path-1.1

# Run specific category
pnpm oracle:graph -- --category pathfinding
```

### Adding New Scenarios

1. Edit `intelgraph/oracle-scenarios.json`
2. Add a new scenario following the schema:

```json
{
  "id": "unique-id",
  "category": "category-name",
  "name": "Human Readable Name",
  "description": "Description of what this scenario tests",
  "enabled": true,
  "query": {
    "type": "graphql",
    "operation": "operationName",
    "document": "query Document { ... }",
    "variables": {}
  },
  "expected": {
    "validation": [
      { "type": "exact", "field": "path.to.field", "value": "expected" }
    ],
    "performance": {
      "maxLatencyMs": 1000
    }
  }
}
```

### Validation Types

- `exact` - Exact value match
- `gte` / `lte` - Greater/less than or equal
- `contains` - Array contains specified values
- `set` - Array matches set (order independent)
- `ordered` - Array matches in exact order
- `allMatch` - All array elements match value
- `null` / `notNull` - Null checking
- `descending` - Array is in descending order

### Reference

- [Oracle Spec](../docs/testing/graph-query-oracle.md)
- [Golden Dataset](../data/golden-path/demo-investigation.json)
