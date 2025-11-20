# NLP and Text Analytics Platform Guide

## Overview

The IntelGraph NLP Platform provides state-of-the-art natural language processing and text analytics capabilities for extracting intelligence from unstructured text data at enterprise scale.

## Table of Contents

1. [Architecture](#architecture)
2. [Quick Start](#quick-start)
3. [Core Packages](#core-packages)
4. [API Reference](#api-reference)
5. [Examples](#examples)
6. [Performance](#performance)
7. [Deployment](#deployment)

## Architecture

The platform consists of multiple specialized packages:

### Core Packages

- **@intelgraph/nlp** - Text preprocessing, tokenization, language detection
- **@intelgraph/entity-extraction** - Named Entity Recognition with multi-language support
- **@intelgraph/text-analytics** - Sentiment analysis, topic modeling, classification
- **@intelgraph/language-models** - Transformer-based models for QA, summarization, translation
- **@intelgraph/nlp-service** - Production-ready REST API

### Services

- **nlp-service** - REST API for all NLP capabilities
- **text-processing** - Background processing service

## Quick Start

### Installation

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm -w run build

# Start NLP service
pnpm --filter @intelgraph/nlp-service dev
```

### Basic Usage

```typescript
import { TextPreprocessor, Tokenizer } from '@intelgraph/nlp';
import { NERExtractor } from '@intelgraph/entity-extraction';
import { SentimentAnalyzer } from '@intelgraph/text-analytics';

// Preprocess text
const preprocessor = new TextPreprocessor({
  lowercase: true,
  removeStopwords: true,
});

const cleaned = preprocessor.preprocess('Your text here');

// Extract entities
const nerExtractor = new NERExtractor();
const entities = nerExtractor.extract(text);

// Analyze sentiment
const sentimentAnalyzer = new SentimentAnalyzer();
const sentiment = sentimentAnalyzer.analyze(text);
```

## Core Packages

### 1. Text Preprocessing (@intelgraph/nlp)

#### Features

- **Language Detection**: Detect 100+ languages with confidence scores
- **Tokenization**: Word and sentence tokenization with position tracking
- **Normalization**: Unicode normalization, case folding, accent removal
- **Spell Checking**: Automatic spell checking and correction
- **Text Cleaning**: HTML/XML stripping, URL removal, noise removal

#### Example

```typescript
import { TextPreprocessor, LanguageDetector, Tokenizer } from '@intelgraph/nlp';

// Language detection
const detector = new LanguageDetector();
const language = detector.detect('Bonjour le monde');
// { language: 'fr', confidence: 0.95 }

// Tokenization
const tokenizer = new Tokenizer();
const tokens = tokenizer.tokenize('Natural language processing');

// Preprocessing
const preprocessor = new TextPreprocessor({
  lowercase: true,
  removeStopwords: true,
  lemmatize: true,
});

const processed = preprocessor.preprocess(text);
```

### 2. Named Entity Recognition (@intelgraph/entity-extraction)

#### Supported Entity Types

- PERSON, ORGANIZATION, LOCATION
- DATE, TIME, MONEY, PERCENT
- PRODUCT, EVENT, WEAPON, VEHICLE, FACILITY
- Custom entity types

#### Features

- Multi-language NER support
- Nested entity recognition
- Entity disambiguation
- Coreference resolution
- Entity linking to knowledge bases
- Confidence scoring

#### Example

```typescript
import { NERExtractor, EntityDisambiguator, EntityLinker } from '@intelgraph/entity-extraction';

// Extract entities
const extractor = new NERExtractor({
  language: 'en',
  minConfidence: 0.7,
  includeNested: true,
});

const entities = extractor.extract(text);

// Disambiguate entities
const disambiguator = new EntityDisambiguator();
const clusters = disambiguator.disambiguate(entities, text);

// Link to knowledge base
const linker = new EntityLinker();
const links = await linker.link(entities[0], ['wikidata']);
```

### 3. Sentiment Analysis (@intelgraph/text-analytics)

#### Features

- Document-level sentiment (positive, negative, neutral)
- Aspect-based sentiment analysis
- Emotion detection (joy, anger, fear, sadness, surprise, disgust)
- Sarcasm detection
- Multi-language sentiment analysis
- Temporal sentiment tracking

#### Example

```typescript
import { SentimentAnalyzer } from '@intelgraph/text-analytics';

const analyzer = new SentimentAnalyzer();

// Basic sentiment
const sentiment = analyzer.analyze(text);
// { sentiment: 'positive', score: 0.8, confidence: 0.9 }

// Aspect-based sentiment
const aspects = analyzer.analyzeAspects(text, ['price', 'quality', 'service']);

// Emotion detection
const emotions = analyzer.detectEmotions(text);

// Sarcasm detection
const sarcasm = analyzer.detectSarcasm(text);
```

### 4. Topic Modeling (@intelgraph/text-analytics)

#### Algorithms

- Latent Dirichlet Allocation (LDA)
- Non-negative Matrix Factorization (NMF)
- BERTopic (neural topic modeling)
- Hierarchical topic modeling
- Dynamic topic modeling over time

#### Example

```typescript
import { TopicModeler, DocumentClusterer } from '@intelgraph/text-analytics';

const modeler = new TopicModeler();

// LDA topic modeling
const topics = modeler.lda(documents, 10);

// Document clustering
const clusterer = new DocumentClusterer();
const clusters = clusterer.kmeans(documents, 5);

// Hierarchical topics
const hierarchy = modeler.hierarchical(documents, 3);

// Dynamic topics over time
const timeline = modeler.dynamic(documentsWithTimestamps, 10);
```

### 5. Text Classification (@intelgraph/text-analytics)

#### Features

- Multi-class and multi-label classification
- Intent classification
- Zero-shot classification
- Spam/fraud detection
- Hate speech and toxicity detection
- Active learning support

#### Example

```typescript
import { TextClassifier, SpamDetector, ToxicityDetector } from '@intelgraph/text-analytics';

const classifier = new TextClassifier();

// Train classifier
classifier.train([
  { text: 'I love this product', label: 'positive' },
  { text: 'This is terrible', label: 'negative' },
]);

// Classify text
const result = classifier.classify(text, ['positive', 'negative', 'neutral']);

// Multi-label classification
const labels = classifier.classifyMultiLabel(text, ['urgent', 'important', 'actionable']);

// Spam detection
const spamDetector = new SpamDetector();
const spam = spamDetector.detect(text);
```

### 6. Language Models (@intelgraph/language-models)

#### Capabilities

- Question answering
- Text summarization (extractive and abstractive)
- Machine translation (100+ language pairs)
- Semantic search
- Text generation
- Paraphrasing

#### Example

```typescript
import {
  QuestionAnswering,
  Summarizer,
  Translator,
  SemanticSearch
} from '@intelgraph/language-models';

// Question answering
const qa = new QuestionAnswering();
const answer = await qa.answer('What is NLP?', context);

// Summarization
const summarizer = new Summarizer();
const summary = await summarizer.abstractive(text, 150);

// Translation
const translator = new Translator();
const translated = await translator.translate(text, 'en', 'es');

// Semantic search
const search = new SemanticSearch();
await search.indexDocuments(documents);
const results = await search.search(query, documents);
```

### 7. Text Similarity (@intelgraph/text-analytics)

#### Methods

- Cosine similarity
- Jaccard similarity
- Levenshtein (edit) distance
- Semantic similarity (embeddings)
- Fuzzy matching
- Duplicate detection

#### Example

```typescript
import { SimilarityEngine, DuplicateDetector } from '@intelgraph/text-analytics';

const engine = new SimilarityEngine();

// Cosine similarity
const similarity = engine.cosineSimilarity(text1, text2);

// Fuzzy matching
const isMatch = engine.fuzzyMatch(text, pattern, 0.8);

// Duplicate detection
const detector = new DuplicateDetector();
const duplicates = detector.detectDuplicates(documents, 0.9);
```

## API Reference

### REST API Endpoints

#### Text Preprocessing

```bash
POST /api/nlp/preprocess
Body: { "text": "string", "options": {} }

POST /api/nlp/tokenize
Body: { "text": "string", "type": "words|sentences" }

POST /api/nlp/detect-language
Body: { "text": "string" }
```

#### Entity Extraction

```bash
POST /api/entities/extract
Body: { "text": "string", "options": {} }

POST /api/entities/disambiguate
Body: { "entities": [], "text": "string" }
```

#### Sentiment Analysis

```bash
POST /api/sentiment/analyze
Body: { "text": "string" }

POST /api/sentiment/aspects
Body: { "text": "string", "aspects": [] }
```

#### Topic Modeling

```bash
POST /api/topics/lda
Body: { "documents": [], "numTopics": 10 }

POST /api/topics/cluster
Body: { "documents": [], "k": 5 }
```

#### Summarization

```bash
POST /api/summarization/extractive
Body: { "text": "string", "maxSentences": 3 }

POST /api/summarization/abstractive
Body: { "text": "string", "maxLength": 150 }
```

## Examples

### Complete NLP Pipeline

```typescript
import {
  TextPreprocessor,
  Tokenizer,
  LanguageDetector,
} from '@intelgraph/nlp';
import { NERExtractor } from '@intelgraph/entity-extraction';
import {
  SentimentAnalyzer,
  TopicModeler,
  RelationshipExtractor,
} from '@intelgraph/text-analytics';

async function analyzeText(text: string) {
  // 1. Detect language
  const detector = new LanguageDetector();
  const language = detector.detect(text);
  console.log('Language:', language);

  // 2. Preprocess
  const preprocessor = new TextPreprocessor();
  const cleaned = preprocessor.preprocess(text);

  // 3. Extract entities
  const ner = new NERExtractor();
  const entities = ner.extract(text);
  console.log('Entities:', entities);

  // 4. Analyze sentiment
  const sentiment = new SentimentAnalyzer();
  const sentimentResult = sentiment.analyze(text);
  console.log('Sentiment:', sentimentResult);

  // 5. Extract relationships
  const relationships = new RelationshipExtractor();
  const rels = relationships.extractSVO(text);
  console.log('Relationships:', rels);

  return {
    language,
    entities,
    sentiment: sentimentResult,
    relationships: rels,
  };
}
```

### Batch Processing

```typescript
import { PreprocessingPipeline } from '@intelgraph/nlp';

async function processBatch(documents: string[]) {
  const pipeline = PreprocessingPipeline.createStandard({
    lowercase: true,
    removeStopwords: true,
  });

  // Process in parallel
  const results = await pipeline.processBatchParallel(documents, 100);

  return results;
}
```

## Performance

### Throughput

- Text preprocessing: ~10,000 documents/second
- Entity extraction: ~1,000 documents/second
- Sentiment analysis: ~5,000 documents/second
- Topic modeling: Scales with document count and complexity

### Optimization Tips

1. **Use batch processing** for large datasets
2. **Enable caching** for repeated analyses
3. **Adjust confidence thresholds** to reduce processing time
4. **Use preprocessing pipelines** for consistent preprocessing
5. **Leverage GPU acceleration** for transformer models

## Deployment

### Docker

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install

COPY . .
RUN pnpm run build

EXPOSE 3010

CMD ["pnpm", "--filter", "@intelgraph/nlp-service", "start"]
```

### Kubernetes

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nlp-service
spec:
  replicas: 3
  selector:
    matchLabels:
      app: nlp-service
  template:
    metadata:
      labels:
        app: nlp-service
    spec:
      containers:
      - name: nlp-service
        image: intelgraph/nlp-service:latest
        ports:
        - containerPort: 3010
        resources:
          requests:
            memory: "2Gi"
            cpu: "1000m"
          limits:
            memory: "4Gi"
            cpu: "2000m"
```

## Support

For questions and support:

- Documentation: https://docs.intelgraph.com/nlp
- GitHub Issues: https://github.com/intelgraph/platform/issues
- Community Forum: https://community.intelgraph.com

## License

MIT License - see LICENSE file for details
