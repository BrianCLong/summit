# @intelgraph/entity-extraction

Named Entity Recognition and entity extraction with multi-language support.

## Features

- **Multi-Entity Types**: PERSON, ORGANIZATION, LOCATION, DATE, TIME, MONEY, PERCENT, and custom types
- **Custom Entity Types**: Weapons, vehicles, facilities, events
- **Multi-Language Support**: NER for multiple languages
- **Entity Disambiguation**: Group and resolve entity references
- **Coreference Resolution**: Link pronouns to antecedents
- **Knowledge Base Linking**: Connect entities to Wikidata, DBpedia

## Installation

```bash
pnpm add @intelgraph/entity-extraction
```

## Quick Start

```typescript
import { NERExtractor, EntityDisambiguator, CoreferenceResolver } from '@intelgraph/entity-extraction';

// Extract entities
const extractor = new NERExtractor({
  minConfidence: 0.7,
  includeNested: true,
});

const entities = extractor.extract('Dr. John Smith works at Apple Inc. in New York.');

// Disambiguate entities
const disambiguator = new EntityDisambiguator();
const clusters = disambiguator.disambiguate(entities, text);

// Resolve coreferences
const resolver = new CoreferenceResolver();
const chains = resolver.resolve(entities, text);
```

## Documentation

See [NLP Guide](../../docs/nlp/GUIDE.md) for comprehensive documentation.
