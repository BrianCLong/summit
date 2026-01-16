# Docs Agent Contract

## Responsibilities
- Generate documentation from code and comments.
- Validate documentation freshness and coverage.
- Publish documentation to portals.

## Policy Gates
- **Freshness**: Fail if documentation is significantly older than code.
- **Coverage**: Warn if public APIs lack documentation.
- **Links**: Fail if dead links are detected.

## Inputs Schema
```json
{
  "type": "object",
  "properties": {
    "action": { "type": "string", "enum": ["generate", "validate", "publish"] },
    "source": { "type": "string" },
    "output_dir": { "type": "string" }
  }
}
```

## Outputs Schema
```json
{
  "type": "object",
  "properties": {
    "status": { "type": "string", "enum": ["success", "failed"] },
    "docs_uri": { "type": "string" },
    "coverage_score": { "type": "number" }
  }
}
```

## Evidence Artifacts
- **Coverage Report**: JSON report of doc coverage.
- **Validation Log**: Log of link checks and freshness checks.
