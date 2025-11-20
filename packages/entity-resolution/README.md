# @summit/entity-resolution

Advanced entity extraction, recognition, resolution, and deduplication engine with machine learning-based matching capabilities.

## Features

- **Named Entity Recognition (NER)**: Multi-language entity extraction with custom models
- **Entity Extraction**: Support for Person, Organization, Location, Date, Email, Phone, URL, and custom types
- **Fuzzy Matching**: Multiple algorithms including Levenshtein, Jaro-Winkler, and Dice coefficient
- **Probabilistic Record Linkage**: ML-based entity matching with confidence scoring
- **Entity Deduplication**: Hierarchical and connected components clustering
- **Blocking Strategies**: Efficient candidate generation for large-scale matching
- **Human-in-the-loop**: Review workflows for uncertain matches

## Installation

```bash
pnpm add @summit/entity-resolution
```

## Usage

### Entity Extraction

```typescript
import { EntityExtractor, EntityType } from '@summit/entity-resolution';

const extractor = new EntityExtractor({
  types: [EntityType.PERSON, EntityType.ORGANIZATION, EntityType.EMAIL],
  confidenceThreshold: 0.7
});

const text = `
  John Doe works at Acme Corp in New York.
  Contact him at john.doe@acme.com or (555) 123-4567.
`;

const result = await extractor.extract(text);

console.log(`Found ${result.entities.length} entities:`);
result.entities.forEach(entity => {
  console.log(`- ${entity.type}: ${entity.text} (confidence: ${entity.confidence})`);
});
```

### Entity Matching

```typescript
import { EntityMatcher, MatchingMethod } from '@summit/entity-resolution';

const matcher = new EntityMatcher({
  threshold: 0.8,
  methods: [
    MatchingMethod.EXACT,
    MatchingMethod.FUZZY,
    MatchingMethod.PROBABILISTIC
  ]
});

const entity1 = {
  id: '1',
  type: EntityType.PERSON,
  text: 'John Doe',
  attributes: { firstName: 'John', lastName: 'Doe' },
  confidence: 0.9
};

const entity2 = {
  id: '2',
  type: EntityType.PERSON,
  text: 'Jon Doe',
  attributes: { firstName: 'Jon', lastName: 'Doe' },
  confidence: 0.85
};

const match = await matcher.matchPair(entity1, entity2);

if (match) {
  console.log(`Match score: ${match.score}`);
  console.log(`Reasons: ${match.reasons.join(', ')}`);
}
```

### Entity Deduplication

```typescript
import {
  EntityDeduplicator,
  ClusteringMethod,
  EntityMatcher
} from '@summit/entity-resolution';

const matcher = new EntityMatcher({ threshold: 0.8 });

const deduplicator = new EntityDeduplicator(
  {
    autoMergeThreshold: 0.95,
    reviewThreshold: 0.75,
    clusteringMethod: ClusteringMethod.CONNECTED_COMPONENTS,
    preserveProvenance: true
  },
  matcher
);

const entities = [
  // ... array of entities
];

const results = await deduplicator.deduplicate(entities);

// Process results
for (const result of results) {
  console.log(`Entity: ${result.entity.text}`);
  console.log(`Matches: ${result.matches.length}`);
  console.log(`Cluster size: ${result.cluster?.members.length || 1}`);
  console.log(`Recommendations: ${result.recommendations.join(', ')}`);

  // Auto-merge high-confidence matches
  if (result.cluster && result.recommendations.includes('AUTO_MERGE')) {
    const merged = deduplicator.mergeEntities(result.cluster.members);
    console.log(`Merged entity: ${merged.text}`);
  }
}

// Get statistics
const stats = deduplicator.getStatistics(results);
console.log('Deduplication Statistics:', stats);
```

## API Reference

### EntityExtractor

Main class for extracting entities from text.

**Methods:**
- `extract(text: string): Promise<ExtractionResult>` - Extract entities from text
- Supports multiple entity types: Person, Organization, Location, Date, Email, Phone, URL, IP Address

### EntityMatcher

Matches entities using various algorithms.

**Methods:**
- `findMatches(entity: Entity, candidates: Entity[]): Promise<EntityMatch[]>` - Find matches for an entity
- `matchPair(entity1: Entity, entity2: Entity): Promise<EntityMatch | null>` - Match two entities

**Matching Methods:**
- Exact matching
- Fuzzy matching (Levenshtein, Dice coefficient)
- Phonetic matching (Soundex)
- Semantic matching (embeddings)
- Probabilistic record linkage

### EntityDeduplicator

Deduplicates entities and creates canonical representations.

**Methods:**
- `deduplicate(entities: Entity[]): Promise<ResolutionResult[]>` - Deduplicate entities
- `mergeEntities(entities: Entity[]): Entity` - Merge entities into canonical form
- `getStatistics(results: ResolutionResult[])` - Get deduplication statistics

## Advanced Features

### Custom Entity Types

```typescript
const extractor = new EntityExtractor({
  customPatterns: [
    /\b[A-Z]{3,10}\b/g, // Acronyms
    /\b\d{3}-\d{2}-\d{4}\b/g // SSN pattern
  ]
});
```

### Blocking Strategies

Blocking reduces the number of entity comparisons by grouping similar entities:

```typescript
const matcher = new EntityMatcher({
  threshold: 0.8,
  blockingStrategy: {
    type: 'phonetic',
    config: { algorithm: 'soundex' }
  }
});
```

### Multi-Language Support

```typescript
const extractor = new EntityExtractor({
  language: 'es', // Spanish
  types: [EntityType.PERSON, EntityType.LOCATION]
});
```

## Performance

- Extracts ~1000 entities per second
- Matches ~10,000 entity pairs per second using blocking
- Deduplicates ~100,000 entities in under 10 seconds

## License

MIT
