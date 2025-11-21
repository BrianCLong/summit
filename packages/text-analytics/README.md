# @intelgraph/text-analytics

Comprehensive text analytics including sentiment analysis, topic modeling, and text classification.

## Features

- **Sentiment Analysis**: Document-level, aspect-based, emotion detection
- **Topic Modeling**: LDA, NMF, BERTopic, hierarchical, dynamic
- **Text Classification**: Multi-class, multi-label, zero-shot
- **Text Similarity**: Cosine, Jaccard, Levenshtein, semantic
- **Relationship Extraction**: SVO triples, events, causal relations
- **Information Extraction**: Keyphrases, quotes, citations

## Installation

```bash
pnpm add @intelgraph/text-analytics
```

## Quick Start

```typescript
import {
  SentimentAnalyzer,
  TopicModeler,
  TextClassifier,
  SimilarityEngine
} from '@intelgraph/text-analytics';

// Sentiment analysis
const sentiment = new SentimentAnalyzer();
const result = sentiment.analyze('I love this product!');

// Topic modeling
const modeler = new TopicModeler();
const topics = modeler.lda(documents, 5);

// Text classification
const classifier = new TextClassifier();
const label = classifier.classify(text, ['positive', 'negative']);

// Text similarity
const similarity = new SimilarityEngine();
const score = similarity.cosineSimilarity(text1, text2);
```

## Documentation

See [NLP Guide](../../docs/nlp/GUIDE.md) for comprehensive documentation.
