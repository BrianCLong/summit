# @intelgraph/language-models

Advanced language models with transformer-based architecture.

## Features

- **Text Embeddings**: Generate dense vector representations
- **Question Answering**: Extract answers from context
- **Summarization**: Extractive and abstractive summarization
- **Translation**: Machine translation for 100+ languages
- **Semantic Search**: Find semantically similar documents
- **Text Generation**: Generate and paraphrase text

## Installation

```bash
pnpm add @intelgraph/language-models
```

## Quick Start

```typescript
import {
  EmbeddingGenerator,
  QuestionAnswering,
  Summarizer,
  Translator,
  SemanticSearch
} from '@intelgraph/language-models';

// Generate embeddings
const embedder = new EmbeddingGenerator();
const embedding = await embedder.encode('Hello world');

// Question answering
const qa = new QuestionAnswering();
const answer = await qa.answer('What is NLP?', context);

// Summarization
const summarizer = new Summarizer();
const summary = await summarizer.abstractive(longText, 150);

// Translation
const translator = new Translator();
const translated = await translator.translate(text, 'en', 'es');

// Semantic search
const search = new SemanticSearch();
const results = await search.search(query, documents);
```

## Documentation

See [NLP Guide](../../docs/nlp/GUIDE.md) for comprehensive documentation.
