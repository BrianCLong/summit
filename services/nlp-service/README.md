# @intelgraph/nlp-service

Production-ready REST API service for NLP and text analytics.

## Features

- **REST API**: Comprehensive endpoints for all NLP capabilities
- **Rate Limiting**: 100 requests per 15 minutes per IP
- **Security**: Helmet middleware for secure headers
- **CORS**: Cross-origin resource sharing enabled
- **Health Checks**: Built-in health monitoring

## Installation

```bash
pnpm add @intelgraph/nlp-service
```

## Quick Start

```bash
# Development
pnpm dev

# Production
pnpm build
pnpm start
```

## API Endpoints

### Text Preprocessing
- `POST /api/nlp/preprocess` - Preprocess text
- `POST /api/nlp/tokenize` - Tokenize text
- `POST /api/nlp/detect-language` - Detect language

### Entity Extraction
- `POST /api/entities/extract` - Extract named entities
- `POST /api/entities/disambiguate` - Disambiguate entities

### Sentiment Analysis
- `POST /api/sentiment/analyze` - Analyze sentiment
- `POST /api/sentiment/aspects` - Aspect-based sentiment

### Topic Modeling
- `POST /api/topics/lda` - LDA topic modeling
- `POST /api/topics/cluster` - Document clustering

### Summarization
- `POST /api/summarization/extractive` - Extractive summary
- `POST /api/summarization/abstractive` - Abstractive summary

## Environment Variables

```env
NODE_ENV=development
NLP_SERVICE_PORT=3010
API_RATE_LIMIT=100
API_TIMEOUT=30000
```

## Documentation

See [API Documentation](../../docs/nlp/API.md) for detailed API reference.
