# GraphQL API for Provenance & Claims Ledger

## Overview

The Provenance & Claims Ledger now provides a comprehensive GraphQL API alongside the existing REST API. This provides a strongly-typed, flexible interface for querying and mutating provenance data.

## Endpoint

```
POST http://localhost:4010/graphql
```

## Authentication

All requests require the following headers:
- `x-authority-id`: Authority identifier
- `x-reason-for-access`: Access justification

## Schema

The GraphQL schema is defined in `src/schema.graphql` and includes the following types:

### Core Types

- **Claim**: Assertion with cryptographic hash
- **Evidence**: File/data with checksums and transform chains
- **ProvenanceChain**: Transformation history tracking
- **Case**: Container grouping related evidence
- **DisclosureBundle**: Merkle-tree-based verification manifest
- **License**: Data usage terms
- **ExportManifest**: Export with hash chain

### Verification Types

- **HashVerification**: Hash integrity check result
- **ChainVerificationResult**: Transform chain validation result

## Features

### 1. Flexible Querying

GraphQL allows clients to request exactly the data they need:

```graphql
query {
  case(id: "case-001") {
    title
    evidence {
      checksum
    }
    # Only fetch the fields you need
  }
}
```

### 2. Nested Data Resolution

Automatically resolve related data:

```graphql
query {
  claim(id: "claim-001") {
    id
    hash
    provenanceChains {
      transforms
      sources
    }
  }
}
```

### 3. Strongly Typed

Full TypeScript support with auto-generated types. The schema provides compile-time safety and IDE autocomplete.

### 4. Introspection

The GraphQL API supports full introspection, enabling tools like GraphQL Playground to provide documentation and autocomplete.

## Example Workflows

### Complete Investigation Workflow

```graphql
# 1. Create a case
mutation CreateCase {
  createCase(input: {
    title: "Investigation Alpha"
    description: "High-priority investigation"
  }) {
    id
    createdAt
  }
}

# 2. Register evidence with transform chain
mutation RegisterEvidence {
  createEvidence(input: {
    caseId: "case-123"
    sourceRef: "s3://bucket/evidence.pdf"
    transformChain: [
      {
        transformType: "ocr"
        actorId: "ocr-service-v2"
        timestamp: "2025-01-20T10:00:00Z"
      }
      {
        transformType: "redaction"
        actorId: "pii-redactor"
        timestamp: "2025-01-20T10:05:00Z"
        config: { method: "automatic" }
      }
    ]
    policyLabels: ["confidential", "investigation"]
  }) {
    id
    checksum
  }
}

# 3. Create claim from evidence
mutation CreateClaim {
  createClaim(input: {
    content: {
      type: "analysis"
      conclusion: "..."
      confidence: 0.92
    }
    sourceRef: "evidence-456"
  }) {
    id
    hash
  }
}

# 4. Track provenance
mutation TrackProvenance {
  createProvenanceChain(input: {
    claimId: "claim-789"
    transforms: ["extraction", "analysis"]
    sources: ["evidence-456"]
    lineage: {
      methodology: "ml-assisted analysis"
      models: ["bert-v2", "validator-v1"]
    }
  }) {
    id
    createdAt
  }
}

# 5. Generate disclosure bundle
query GenerateBundle {
  disclosureBundle(caseId: "case-123") {
    merkleRoot
    hashTree
    evidence {
      id
      checksum
    }
  }
}

# 6. Verify transform chain
query VerifyChain {
  verifyTransformChain(evidenceId: "evidence-456") {
    valid
    transformChainValid
    checksumValid
    issues
  }
}
```

## Verification & Integrity

### Hash Verification

```graphql
mutation VerifyHash {
  verifyHash(input: {
    content: { data: "content" }
    expectedHash: "abc123..."
  }) {
    valid
    actualHash
    verifiedAt
  }
}
```

### Transform Chain Verification

```graphql
query VerifyTransformChain {
  verifyTransformChain(evidenceId: "evidence-001") {
    valid
    transformChainValid
    checksumValid
    issues
    verifiedAt
  }
}
```

## Performance Considerations

### Field Resolvers

The API uses DataLoader-style batching for nested queries to prevent N+1 queries. Field resolvers are optimized to:

1. Only execute when fields are requested
2. Batch database queries where possible
3. Use database indexes for fast lookups

### Pagination

All list queries support pagination:

```graphql
query {
  claims(limit: 20, offset: 0) {
    id
    hash
  }
}
```

## Error Handling

GraphQL errors include detailed information:

```json
{
  "errors": [
    {
      "message": "Evidence not found",
      "path": ["evidence"],
      "extensions": {
        "code": "NOT_FOUND"
      }
    }
  ]
}
```

## Development Tools

### GraphQL Playground

When running in development mode (`NODE_ENV=development`), visit:

```
http://localhost:4010/graphql
```

This provides:
- Interactive query editor with syntax highlighting
- Auto-complete based on schema
- Documentation browser
- Query history

### Environment Variables

```bash
ENABLE_GRAPHQL=true    # Enable GraphQL API (default: true)
NODE_ENV=development   # Enables GraphQL Playground
```

## Migration from REST

The GraphQL API complements the REST API. Both can be used simultaneously. Here's a comparison:

### REST
```http
GET /evidence/evidence-001
GET /provenance?claimId=claim-001
```

### GraphQL
```graphql
query {
  evidence(id: "evidence-001") {
    id
    checksum
    case {
      title
    }
  }
  provenanceChains(claimId: "claim-001") {
    transforms
  }
}
```

**Benefits of GraphQL:**
- Single request for related data
- Exactly the fields you need
- Strongly typed
- Self-documenting

## Testing

Integration tests are available in `test/integration/graphql.test.ts`.

Run tests:
```bash
npm test -- test/integration/graphql.test.ts
```

## Future Enhancements

Potential additions:

1. **Subscriptions**: Real-time updates for evidence registration
2. **Federation**: Integrate with other services via Apollo Federation
3. **Caching**: Add response caching with TTL
4. **Rate Limiting**: Per-field complexity analysis
5. **Custom Directives**: `@auth`, `@deprecated`, `@cache`

## Resources

- [GraphQL Specification](https://graphql.org/learn/)
- [Apollo Server Documentation](https://www.apollographql.com/docs/apollo-server/)
- [Schema SDL Reference](./src/schema.graphql)
- [Resolver Implementation](./src/graphql/resolvers.ts)
