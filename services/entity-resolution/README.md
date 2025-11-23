# Entity Resolution Service with Explainability

A production-ready entity resolution (ER) service that determines whether records represent the same real-world entity, with full explainability, reversible merges, and human-in-the-loop controls.

## Features

### Core Capabilities

- **Deterministic Matching**: Transparent, rules-based scoring with configurable weights
- **Explainability**: Every decision includes feature contributions and human-readable rationales
- **Reversible Merges**: All merges store pre-merge snapshots for split/undo operations
- **Blocking Strategy**: Efficient O(N) candidate generation to avoid O(N²) comparisons
- **Human-in-the-Loop**: Review workflows for ambiguous cases

### API Endpoints

- `POST /er/compare` - Compare two entity records
- `POST /er/batch-candidates` - Find candidate matches for a batch of records
- `POST /er/merge` - Merge two entity records (reversible)
- `POST /er/split` - Undo a merge operation
- `GET /er/decisions/:id` - Get match decision with full explainability
- `GET /er/merge-history/:recordId` - Get merge history for a record
- `GET /er/health` - Health check

## Quick Start

### Installation

```bash
cd services/entity-resolution
pnpm install
```

### Development

```bash
# Start dev server with auto-reload
pnpm dev

# Run tests
pnpm test

# Type check
pnpm typecheck

# Build
pnpm build
```

### Production

```bash
# Build and start
pnpm build
pnpm start
```

## Architecture

### Domain Models

- **EntityRecord**: Schema-agnostic entity representation
- **FeatureVector**: Normalized features for pairwise comparison
- **MatchDecision**: Decision with full explainability
- **MergeOperation**: Merge record with pre-merge snapshots

### Feature Extraction

The service extracts features from entity attributes:

- **Name similarity** (Jaro-Winkler)
- **Email similarity** (exact match with normalization)
- **Organization similarity** (fuzzy match)
- **Geographic proximity** (Haversine distance)
- **Temporal overlap** (time period intersection)
- **Shared identifiers** (phone, SSN, account IDs)

### Blocking Strategy

To avoid O(N²) comparisons, records are grouped by blocking keys:

- Email domain
- Last name + country
- Phone prefix
- Organization name prefix

Only records sharing blocking keys are compared.

### Classifier

Simple weighted rules-based classifier:

```typescript
score = Σ(feature_value_normalized * weight)
```

Decision thresholds:
- `score >= mergeThreshold` → **MERGE**
- `score <= reviewThreshold` → **NO_MATCH**
- Otherwise → **REVIEW**

Default configuration:

```typescript
{
  featureWeights: {
    nameSimilarity: 0.3,
    emailSimilarity: 0.4,
    orgSimilarity: 0.1,
    temporalOverlapScore: 0.1,
    sharedIdentifiersCount: 0.1,
  },
  mergeThreshold: 0.8,
  reviewThreshold: 0.5,
}
```

## Usage Examples

### Compare Two Records

```bash
curl -X POST http://localhost:3100/er/compare \
  -H "Content-Type: application/json" \
  -d '{
    "recordA": {
      "id": "A1",
      "entityType": "Person",
      "attributes": {
        "name": "John Smith",
        "email": "john.smith@example.com"
      }
    },
    "recordB": {
      "id": "B1",
      "entityType": "Person",
      "attributes": {
        "name": "J. Smith",
        "email": "john.smith@example.com"
      }
    }
  }'
```

**Response:**

```json
{
  "recordIdA": "A1",
  "recordIdB": "B1",
  "matchScore": 0.88,
  "outcome": "MERGE",
  "explanation": {
    "summary": "MERGE recommended (score: 0.88) due to exact email match and high name similarity",
    "featureContributions": [
      {
        "feature": "nameSimilarity",
        "value": 0.92,
        "weight": 0.3,
        "contribution": 0.276,
        "rationale": "High name similarity"
      },
      {
        "feature": "emailSimilarity",
        "value": 1.0,
        "weight": 0.4,
        "contribution": 0.4,
        "rationale": "Exact email match"
      }
    ]
  },
  "decidedAt": "2025-11-22T10:30:00.000Z",
  "decidedBy": "er-engine",
  "id": "decision-1732270200000-0.123"
}
```

### Batch Candidate Matching

```bash
curl -X POST http://localhost:3100/er/batch-candidates \
  -H "Content-Type: application/json" \
  -d '{
    "records": [
      {
        "id": "1",
        "entityType": "Person",
        "attributes": {
          "name": "Alice Johnson",
          "email": "alice@example.com"
        }
      },
      {
        "id": "2",
        "entityType": "Person",
        "attributes": {
          "name": "Alice J.",
          "email": "alice@example.com"
        }
      },
      {
        "id": "3",
        "entityType": "Person",
        "attributes": {
          "name": "Bob Smith",
          "email": "bob@different.com"
        }
      }
    ],
    "maxCandidatesPerRecord": 10
  }'
```

### Merge Records

```bash
curl -X POST http://localhost:3100/er/merge \
  -H "Content-Type: application/json" \
  -H "X-User-Id: user-123" \
  -d '{
    "primaryId": "A1",
    "secondaryId": "B1",
    "reason": "Same person confirmed by analyst",
    "decisionId": "decision-1732270200000-0.123"
  }'
```

### Split (Undo) Merge

```bash
curl -X POST http://localhost:3100/er/split \
  -H "Content-Type: application/json" \
  -H "X-User-Id: user-123" \
  -d '{
    "mergeId": "merge-abc-123",
    "reason": "Incorrect merge - different people"
  }'
```

## Explainability

Every match decision includes:

1. **Feature Contributions**: Each feature's value, weight, and contribution to the final score
2. **Rationales**: Human-readable explanations for each feature
3. **Summary**: High-level explanation of the decision

Example rationales:
- "Exact email match"
- "High name similarity"
- "Very close proximity (2.5 km apart)"
- "1 shared identifier"

## Merge Semantics

### Merge Strategy

When merging `secondary` into `primary`:

1. **Pre-merge snapshot**: Store both records for reversibility
2. **Attribute merging**: Prefer non-null values from `primary`, fill missing from `secondary`
3. **Mark secondary**: Add `_merged: true` and `_mergedInto: primaryId` to secondary record
4. **Audit trail**: Create `MergeOperation` record

### Split (Undo) Strategy

When splitting a merge:

1. **Restore original records** from pre-merge snapshot
2. **Update merge operation** status to `REJECTED`

## Configuration

### Feature Weights

Adjust weights in `ClassifierConfig`:

```typescript
const config: ClassifierConfig = {
  featureWeights: {
    nameSimilarity: 0.4,      // Increase if name is more important
    emailSimilarity: 0.5,     // Increase for strict email matching
    orgSimilarity: 0.05,      // Decrease if less important
    temporalOverlapScore: 0.05,
    sharedIdentifiersCount: 0.0,
  },
  mergeThreshold: 0.9,        // Higher = more conservative merges
  reviewThreshold: 0.5,       // Lower = fewer ambiguous cases
};
```

### Attribute Mapping

The service tries multiple attribute names:

- **Name**: `name`, `fullName`, `full_name`, `firstName` + `lastName`
- **Email**: `email`, `emailAddress`, `email_address`
- **Organization**: `organization`, `org`, `employer`, `company`
- **Location**: `coordinates`, `location`, `lat`/`lng`
- **Time periods**: `activeFrom`, `activeTo`, `startDate`, `endDate`

Add custom mappings in `features/extraction.ts`.

## Testing

### Unit Tests

```bash
# Run all tests
pnpm test

# Watch mode
pnpm test:watch

# Coverage
pnpm test -- --coverage
```

### Test Data

The test suite includes:

- **Clear matches**: Same email, high name similarity
- **Clear non-matches**: Different domains, different names
- **Ambiguous cases**: Same name, different email → REVIEW

## Deployment

### Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile
COPY . .
RUN pnpm build
EXPOSE 3100
CMD ["pnpm", "start"]
```

### Environment Variables

- `PORT`: Server port (default: 3100)
- `NODE_ENV`: Environment (development, production)

## Roadmap

### Future Enhancements

- [ ] Replace in-memory repositories with PostgreSQL/Neo4j
- [ ] Add GraphQL API alongside REST
- [ ] ML-based scoring (train on labeled pairs)
- [ ] Active learning: use human feedback to improve classifier
- [ ] Batch processing: Async jobs for large datasets
- [ ] Streaming API: Real-time entity resolution
- [ ] Performance optimizations: Caching, indexing

## References

- **Fellegi-Sunter Model**: Probabilistic record linkage
- **Jaro-Winkler Distance**: String similarity for names
- **Blocking**: Reducing comparison space
- **Entity Resolution Survey**: Christen (2012)

## License

See repository root for license information.
