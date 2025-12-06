# Human-in-the-Loop Labeling Service

A comprehensive labeling service with reviewer queues, adjudication workflows, inter-rater agreement statistics, and full cryptographically-signed audit trails. Every label is traceable to its source evidence with complete provenance.

## Features

### Core Capabilities

- **Reviewer Queues**: Organize labeling tasks with role-based assignment
- **Adjudication Workflows**: Resolve conflicting reviews with transparent reasoning
- **Inter-Rater Agreement**: Calculate Cohen's Kappa, Fleiss' Kappa, and confusion matrices
- **Cryptographic Audit Trails**: Every action signed with Ed25519 for non-repudiation
- **Decision Ledger**: Exportable, signed ledger proving traceability to source evidence
- **Role-Based Access Control**: Labeler, Reviewer, Adjudicator, and Admin roles

### Security & Compliance

- ✅ **Cryptographically signed** audit events (Ed25519)
- ✅ **Merkle tree** verification for decision ledger exports
- ✅ **Complete audit trail** from label creation to final decision
- ✅ **Source evidence tracking** for every label
- ✅ **Non-repudiation** through digital signatures

## Architecture

```
┌──────────────┐
│   Labeler    │ Creates labels with source evidence
└──────┬───────┘
       │
       v
┌──────────────┐
│ Review Queue │ Assigns to reviewers
└──────┬───────┘
       │
       v
┌──────────────┐       ┌────────────────┐
│  Reviewers   │──────>│ Adjudicator    │ (if needed)
└──────┬───────┘       └────────┬───────┘
       │                        │
       v                        v
┌─────────────────────────────────────┐
│      Decision Ledger (signed)        │
│  - Final label                       │
│  - Source evidence                   │
│  - Complete audit trail              │
│  - All signatures                    │
└─────────────────────────────────────┘
```

## Installation

```bash
cd services/labeling-service
pnpm install
```

## Database Setup

```bash
# Run migrations
pnpm migrate

# Or manually
tsx src/scripts/migrate.ts
```

## Configuration

Set these environment variables:

```bash
PORT=4020
NODE_ENV=development
DATABASE_URL=postgres://postgres:postgres@localhost:5432/labeling
CORS_ORIGIN=http://localhost:3000
```

## Running

```bash
# Development
pnpm dev

# Production
pnpm build
pnpm start

# With Docker
docker build -t labeling-service .
docker run -p 4020:4020 labeling-service
```

## API Endpoints

### Labels

#### Create Label
```bash
POST /labels
Headers:
  x-user-id: user-123
Body:
{
  "entityId": "entity-456",
  "entityType": "entity",
  "labelType": "sentiment",
  "labelValue": {"sentiment": "positive", "score": 0.9},
  "confidence": 0.85,
  "sourceEvidence": ["evidence-1", "evidence-2"],
  "reasoning": "Strong positive indicators in text"
}
```

#### Get Label
```bash
GET /labels/:id
Headers:
  x-user-id: user-123
```

#### List Labels
```bash
GET /labels?status=pending&labelType=sentiment&limit=50&offset=0
Headers:
  x-user-id: user-123
```

### Reviews

#### Submit Review
```bash
POST /reviews
Headers:
  x-user-id: reviewer-123
Body:
{
  "labelId": "label-456",
  "approved": true,
  "reasoning": "Labeling is accurate based on evidence",
  "feedback": "Good work"
}
```

#### Get Reviews for Label
```bash
GET /labels/:labelId/reviews
Headers:
  x-user-id: user-123
```

#### Verify Review Signature
```bash
POST /reviews/verify
Headers:
  x-user-id: user-123
Body:
{
  "reviewId": "review-789"
}
```

### Queues

#### Create Queue
```bash
POST /queues
Headers:
  x-user-id: admin-123
Body:
{
  "name": "Sentiment Labeling Queue",
  "description": "Queue for sentiment analysis labels",
  "labelType": "sentiment",
  "entityType": "document",
  "assignedTo": ["reviewer-1", "reviewer-2"],
  "requiredReviews": 2
}
```

#### Assign Label to Queue
```bash
POST /queues/assign
Headers:
  x-user-id: admin-123
Body:
{
  "labelId": "label-456",
  "queueId": "queue-789"
}
```

#### Get Queue Statistics
```bash
GET /queues/:id/stats
Headers:
  x-user-id: user-123
```

### Adjudication

#### Request Adjudication
```bash
POST /adjudications
Headers:
  x-user-id: reviewer-123
Body:
{
  "labelId": "label-456",
  "conflictingReviews": ["review-1", "review-2"],
  "reason": "Reviewers disagree on sentiment classification"
}
```

#### Resolve Adjudication
```bash
POST /adjudications/:id/resolve
Headers:
  x-user-id: adjudicator-123
Body:
{
  "resolution": {"sentiment": "positive", "score": 0.8},
  "reasoning": "After review of evidence, positive sentiment is correct"
}
```

#### List Pending Adjudications
```bash
GET /adjudications?resolved=false
Headers:
  x-user-id: user-123
```

### Statistics & Analytics

#### Calculate Inter-Rater Agreement
```bash
POST /statistics/inter-rater-agreement
Headers:
  x-user-id: user-123
Body:
{
  "labelType": "sentiment",
  "raterIds": ["reviewer-1", "reviewer-2"],
  "sampleSize": 100
}

Response:
{
  "labelType": "sentiment",
  "raters": ["reviewer-1", "reviewer-2"],
  "sampleSize": 87,
  "cohensKappa": 0.756,
  "percentAgreement": 0.862,
  "confusionMatrix": {
    "positive": {"positive": 45, "negative": 5},
    "negative": {"positive": 7, "negative": 30}
  },
  "calculatedAt": "2025-11-22T10:30:00Z"
}
```

#### Get User Statistics
```bash
GET /statistics/user/:userId
Headers:
  x-user-id: user-123

Response:
{
  "userId": "reviewer-1",
  "totalLabelsCreated": 150,
  "totalReviews": 450,
  "approvalRate": 85.5,
  "avgReviewTime": 45.2
}
```

### Audit Trail

#### Get Audit Trail for Label
```bash
GET /audit/label/:labelId
Headers:
  x-user-id: user-123

Response:
{
  "labelId": "label-456",
  "events": [
    {
      "id": "audit-001",
      "eventType": "label_created",
      "userId": "labeler-123",
      "labelId": "label-456",
      "afterState": {...},
      "reasoning": "Created based on source evidence",
      "timestamp": "2025-11-22T10:00:00Z",
      "signature": "a1b2c3...",
      "publicKey": "d4e5f6..."
    },
    {
      "id": "audit-002",
      "eventType": "label_reviewed",
      "userId": "reviewer-1",
      "labelId": "label-456",
      "reviewId": "review-789",
      "reasoning": "Approved after evidence review",
      "timestamp": "2025-11-22T10:15:00Z",
      "signature": "g7h8i9...",
      "publicKey": "d4e5f6..."
    }
  ]
}
```

#### Verify Audit Event Signature
```bash
POST /audit/verify
Headers:
  x-user-id: user-123
Body:
{
  "auditEventId": "audit-001"
}

Response:
{
  "auditEventId": "audit-001",
  "valid": true,
  "signature": "a1b2c3...",
  "publicKey": "d4e5f6...",
  "verifiedAt": "2025-11-22T11:00:00Z"
}
```

### Decision Ledger

#### Export Decision Ledger
```bash
POST /decision-ledger/export
Headers:
  x-user-id: admin-123
Body:
{
  "filters": {
    "labelType": "sentiment",
    "startDate": "2025-11-01",
    "endDate": "2025-11-22"
  }
}

Response:
{
  "exportId": "export-abc123",
  "entries": [
    {
      "id": "label-456",
      "labelId": "label-456",
      "entityId": "entity-789",
      "entityType": "document",
      "finalLabel": {"sentiment": "positive", "score": 0.85},
      "createdBy": "labeler-123",
      "reviewedBy": ["reviewer-1", "reviewer-2"],
      "adjudicatedBy": null,
      "sourceEvidence": ["evidence-1", "evidence-2", "evidence-3"],
      "reasoning": "Consistent positive sentiment in source",
      "auditTrail": ["audit-001", "audit-002", "audit-003"],
      "timestamp": "2025-11-22T10:30:00Z",
      "signature": "j1k2l3..."
    }
  ],
  "metadata": {
    "exportedBy": "admin-123",
    "exportedAt": "2025-11-22T12:00:00Z",
    "totalEntries": 1,
    "filters": {...}
  },
  "signature": "m4n5o6...",
  "merkleRoot": "p7q8r9..."
}
```

## Testing

### Run Unit Tests
```bash
pnpm test

# With coverage
pnpm test:coverage
```

### Run Integration Tests
```bash
# Ensure test database is available
export TEST_DATABASE_URL=postgres://postgres:postgres@localhost:5432/labeling_test

# Run tests
pnpm test test/integration
```

### Example Integration Test
The integration test in `test/integration/label-traceability.test.ts` proves complete traceability:

1. ✅ Creates a label with source evidence
2. ✅ Creates multiple reviews (including conflicting ones)
3. ✅ Triggers adjudication workflow
4. ✅ Records every action in audit trail with signatures
5. ✅ Exports to decision ledger
6. ✅ Verifies all signatures
7. ✅ Proves complete chain: evidence → label → reviews → adjudication → ledger

## Data Flow

### Complete Labeling Workflow

```mermaid
sequenceDiagram
    participant L as Labeler
    participant S as Service
    participant DB as Database
    participant R as Reviewer
    participant A as Adjudicator

    L->>S: Create Label (with evidence)
    S->>DB: Store Label
    S->>DB: Create Audit Event (signed)

    R->>S: Submit Review
    S->>DB: Store Review (signed)
    S->>DB: Create Audit Event (signed)

    alt Conflicting Reviews
        R->>S: Request Adjudication
        S->>DB: Create Adjudication Request
        A->>S: Resolve Adjudication
        S->>DB: Store Resolution (signed)
        S->>DB: Create Audit Event (signed)
    end

    S->>DB: Create Decision Ledger Entry (signed, with Merkle root)
```

## Inter-Rater Agreement

### Interpretation of Kappa Scores

| Kappa Value | Interpretation      |
|-------------|---------------------|
| < 0         | Poor (worse than chance) |
| 0.00 - 0.20 | Slight              |
| 0.21 - 0.40 | Fair                |
| 0.41 - 0.60 | Moderate            |
| 0.61 - 0.80 | Substantial         |
| 0.81 - 1.00 | Almost Perfect      |

### Example: Calculating Agreement

```typescript
// For 2 raters: Cohen's Kappa
const agreement = await calculateCohensKappa(
  ['A', 'B', 'C', 'A'],  // Rater 1
  ['A', 'B', 'C', 'B']   // Rater 2
);
// Result: ~0.67 (Substantial agreement)

// For 3+ raters: Fleiss' Kappa
const agreement = await calculateFleissKappa([
  ['A', 'A', 'A'],  // Subject 1: all rated 'A'
  ['B', 'B', 'C'],  // Subject 2: mostly 'B'
  ['C', 'C', 'C'],  // Subject 3: all rated 'C'
]);
```

## Role-Based Access Control

### User Roles

| Role        | Permissions                                    |
|-------------|------------------------------------------------|
| **Labeler** | Create labels                                  |
| **Reviewer**| Review labels, request adjudication           |
| **Adjudicator** | Resolve adjudications                     |
| **Admin**   | All permissions, manage queues                 |

### Assigning Roles

```sql
INSERT INTO user_roles (user_id, role, granted_by)
VALUES
  ('user-123', 'labeler', 'admin-456'),
  ('user-123', 'reviewer', 'admin-456');
```

## Security Considerations

### Production Deployment

1. **Use proper JWT authentication** instead of `x-user-id` headers
2. **Store private keys securely** (e.g., AWS KMS, HashiCorp Vault)
3. **Enable TLS/SSL** for all connections
4. **Implement rate limiting** to prevent abuse
5. **Audit key rotation** regularly
6. **Use prepared statements** for all database queries (already implemented)

### Signature Verification

Every audit event, review, adjudication, and decision ledger entry includes:
- **Ed25519 signature** for non-repudiation
- **Public key** for verification
- **Timestamp** for temporal ordering

Example verification:
```typescript
import { verifySignature } from './utils/crypto.js';

const isValid = await verifySignature(
  auditEvent,           // Original data
  auditEvent.signature, // Signature
  auditEvent.publicKey  // Public key
);

if (!isValid) {
  throw new Error('Audit trail tampered!');
}
```

## Performance Considerations

- **Indexed queries**: All foreign keys and common query fields are indexed
- **Connection pooling**: PostgreSQL connection pool (max 20 connections)
- **Pagination**: All list endpoints support limit/offset
- **Caching**: Inter-rater agreement results are cached in database

## License

MIT

## Contributing

1. Run tests: `pnpm test`
2. Run linter: `pnpm lint`
3. Run type check: `pnpm typecheck`
4. Ensure all tests pass before submitting PR

## Support

For issues or questions, please open an issue on GitHub.
