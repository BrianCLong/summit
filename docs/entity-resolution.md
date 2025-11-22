# Entity Resolution Service Documentation

## Overview

The Entity Resolution (ER) Service determines whether records represent the same real-world entity using deterministic, explainable matching with reversible merges and human-in-the-loop workflows.

## Architecture

### Components

```
┌─────────────────────────────────────────────────────────┐
│                    HTTP API Layer                        │
│  /er/compare | /er/batch-candidates | /er/merge | ...   │
└───────────────────────┬─────────────────────────────────┘
                        │
┌───────────────────────▼─────────────────────────────────┐
│                   ErService                              │
│  • compare()       • merge()        • split()            │
│  • batchCandidates()  • getMergeHistory()                │
└──┬─────────────────┬──────────────────┬─────────────────┘
   │                 │                  │
   │                 │                  │
┌──▼────────┐  ┌────▼──────┐  ┌────────▼────────┐
│ Classifier │  │  Blocking │  │  Repositories   │
│ (Scoring)  │  │ (Blocking)│  │  • EntityRecord │
│            │  │           │  │  • MatchDecision│
└──┬─────────┘  └───────────┘  │  • MergeOp      │
   │                            └─────────────────┘
┌──▼─────────────────────────┐
│  Feature Extraction        │
│  • Normalization           │
│  • Similarity Functions    │
└────────────────────────────┘
```

## Decision Flow

### 1. Feature Extraction

Given two `EntityRecord` objects `A` and `B`, extract features:

```typescript
const fv: FeatureVector = buildFeatureVector(A, B);
// Result:
// {
//   nameSimilarity: 0.92,
//   emailSimilarity: 1.0,
//   orgSimilarity: 0.85,
//   geoProximityKm: 2.5,
//   temporalOverlapScore: 0.7,
//   sharedIdentifiersCount: 1
// }
```

### 2. Scoring

Apply weighted scoring:

```typescript
score = Σ(normalizedFeatureValue * weight)
```

Example:
```
score = 0.92 * 0.3 (name)
      + 1.0 * 0.4  (email)
      + 0.85 * 0.1 (org)
      + ...
      = 0.88
```

### 3. Classification

Apply thresholds:

```typescript
if (score >= 0.8) return 'MERGE';
if (score <= 0.5) return 'NO_MATCH';
return 'REVIEW';
```

### 4. Explainability

For each feature, generate:

- **Contribution**: `normalizedValue * weight`
- **Rationale**: Human-readable explanation
- **Summary**: Top contributors

Example:

```json
{
  "summary": "MERGE recommended (score: 0.88) due to exact email match and high name similarity",
  "featureContributions": [
    {
      "feature": "emailSimilarity",
      "value": 1.0,
      "weight": 0.4,
      "contribution": 0.4,
      "rationale": "Exact email match"
    },
    {
      "feature": "nameSimilarity",
      "value": 0.92,
      "weight": 0.3,
      "contribution": 0.276,
      "rationale": "High name similarity"
    }
  ]
}
```

## Blocking Strategy

### Problem

Comparing all pairs of N records requires O(N²) comparisons.

### Solution

**Blocking**: Group records by shared keys, only compare within groups.

### Blocking Keys

- **Email domain**: `email_domain:example.com`
- **Name + Country**: `name_country:smith:us`
- **Phone prefix**: `phone_prefix:+1-5`
- **Organization**: `org:acme`

### Example

Records:
```
A: email=alice@example.com
B: email=bob@example.com
C: email=charlie@different.com
```

Blocking groups:
```
email_domain:example.com → [A, B]
email_domain:different.com → [C]
```

Candidate pairs: `[(A, B)]`

**Complexity**: O(N) for grouping + O(k²) for comparisons within groups (where k << N)

## Merge and Split

### Merge Workflow

1. **Pre-merge validation**
   - Fetch `primary` and `secondary` records
   - Ensure both exist

2. **Create merge operation**
   - Generate unique `mergeId`
   - Store pre-merge snapshots
   - Record triggeredBy, reason, timestamp

3. **Attribute merging**
   - Copy all attributes from `primary`
   - Fill missing attributes from `secondary`
   - Do not overwrite non-null `primary` values

4. **Mark secondary as merged**
   - Add `_merged: true`
   - Add `_mergedInto: primaryId`
   - Add `_mergeOperationId: mergeId`

5. **Persist**
   - Update `primary` record
   - Update `secondary` record
   - Save `MergeOperation`

### Split Workflow

1. **Fetch merge operation**
   - Load by `mergeId`
   - Verify status is `APPLIED`

2. **Restore snapshots**
   - Load `preMergeSnapshot.primaryRecord`
   - Load `preMergeSnapshot.secondaryRecord`
   - Save both to repository

3. **Update merge operation**
   - Set `outcome: 'REJECTED'`

## Tuning the Classifier

### Adjusting Weights

Increase weight if feature is more important:

```typescript
const config: ClassifierConfig = {
  featureWeights: {
    nameSimilarity: 0.5,    // ↑ More weight on name
    emailSimilarity: 0.3,   // ↓ Less weight on email
    ...
  },
  mergeThreshold: 0.85,     // ↑ More conservative
  reviewThreshold: 0.4,     // ↓ Fewer ambiguous cases
};
```

### Adjusting Thresholds

- **`mergeThreshold`**: Higher = fewer auto-merges, more precision
- **`reviewThreshold`**: Lower = fewer reviews, more auto-decisions

### Validation

Use labeled test data:

```typescript
const testCases = [
  { recordA, recordB, expectedOutcome: 'MERGE' },
  { recordA, recordC, expectedOutcome: 'NO_MATCH' },
  ...
];

for (const { recordA, recordB, expectedOutcome } of testCases) {
  const decision = decideMatch(recordA, recordB, config);
  assert(decision.outcome === expectedOutcome);
}
```

## Human-in-the-Loop

### Workflow

1. **System recommends**: `MERGE`, `REVIEW`, or `NO_MATCH`
2. **Analyst reviews**: View explainability
3. **Analyst decides**: Confirm, reject, or override
4. **System applies**: Execute merge or log rejection

### API Integration

```typescript
// 1. System suggests
const decision = await erService.compare(recordA, recordB);

// 2. Show decision to analyst
showDecisionUI(decision);

// 3. Analyst confirms
if (analystConfirms) {
  await erService.merge(
    decision.recordIdA,
    decision.recordIdB,
    analystUserId,
    'Confirmed by analyst',
    decision.id
  );
}

// 4. If incorrect, analyst can split later
if (analystRealizesError) {
  await erService.split(mergeId, 'Incorrect merge', analystUserId);
}
```

## Extending the Service

### Adding Custom Features

1. **Extract new attribute** in `features/extraction.ts`

```typescript
function extractCustomField(entity: EntityRecord): string | null {
  return entity.attributes.customField || null;
}
```

2. **Compute similarity**

```typescript
const customA = extractCustomField(a);
const customB = extractCustomField(b);
if (customA && customB) {
  features.customFieldSimilarity = stringSimilarity(customA, customB);
}
```

3. **Add weight** in `ClassifierConfig`

```typescript
featureWeights: {
  ...
  customFieldSimilarity: 0.2,
}
```

### Adding Custom Blocking Keys

In `matching/blocking.ts`:

```typescript
// Custom blocking key based on year of birth
const birthYear = extractBirthYear(record);
if (birthYear) {
  keys.push({ key: `birth_year:${birthYear}` });
}
```

## Performance Considerations

### Blocking Effectiveness

- **Good blocking**: Few large groups
- **Bad blocking**: One giant group or many tiny groups

Monitor:

```typescript
const groups = groupByBlockingKeys(records);
const groupSizes = Array.from(groups.values()).map(g => g.length);
console.log('Avg group size:', avg(groupSizes));
console.log('Max group size:', Math.max(...groupSizes));
```

### Scalability

- **In-memory repos**: Good for < 10K records
- **Production**: Use PostgreSQL/Neo4j with indexes
- **Batch processing**: Process large datasets asynchronously

## API Reference

See [services/entity-resolution/README.md](../services/entity-resolution/README.md) for full API documentation.

## Testing

### Unit Tests

- `classifier.test.ts`: Scoring and decision logic
- `blocking.test.ts`: Blocking key generation
- `ErService.test.ts`: Integration tests

### Test Coverage

Run:
```bash
cd services/entity-resolution
pnpm test -- --coverage
```

Target: > 80% coverage

## Troubleshooting

### Issue: Too many false positives

**Solution**: Increase `mergeThreshold` or adjust feature weights

### Issue: Too many reviews

**Solution**: Adjust `reviewThreshold` or improve blocking

### Issue: Split fails

**Cause**: No pre-merge snapshot

**Solution**: Ensure merges always save snapshots

## Monitoring

### Key Metrics

- **Match distribution**: % MERGE / REVIEW / NO_MATCH
- **Merge rate**: Merges per day
- **Split rate**: Splits per day (should be low)
- **Avg match score**: Trend over time
- **Blocking efficiency**: Avg pairs per record

### Alerts

- High split rate → Classifier needs tuning
- Low match scores → Feature weights may be off
- Large blocking groups → Blocking keys need refinement

## References

- [Fellegi-Sunter Model](https://en.wikipedia.org/wiki/Fellegi%E2%80%93Sunter_method)
- [Record Linkage Survey (Christen, 2012)](https://datamining.anu.edu.au/linkage.html)
- [Jaro-Winkler Distance](https://en.wikipedia.org/wiki/Jaro%E2%80%93Winkler_distance)
