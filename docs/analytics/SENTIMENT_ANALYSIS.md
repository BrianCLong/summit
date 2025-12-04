# Sentiment and Narrative Analysis System

Enterprise-grade AI-powered sentiment analysis and narrative intelligence for influence operations detection.

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Components](#components)
4. [Installation](#installation)
5. [Usage](#usage)
6. [API Reference](#api-reference)
7. [Integration](#integration)
8. [Performance](#performance)
9. [Security](#security)

## Overview

The Sentiment and Narrative Analysis System provides comprehensive tools for:

- **Text Sentiment Analysis**: Fine-tuned BERT/RoBERTa models for domain-specific sentiment
- **Multi-Aspect Sentiment**: Topic-level granular sentiment analysis
- **Emotion Classification**: 7-class emotion detection (anger, fear, joy, sadness, surprise, disgust, trust)
- **Sarcasm & Irony Detection**: Advanced linguistic pattern recognition
- **Narrative Extraction**: Story arc identification and narrative framing analysis
- **Counter-Narrative Detection**: Identifying opposing narratives
- **Influence Operations**: Bot detection, CIB, astroturfing, amplification networks
- **Temporal Tracking**: Sentiment time-series and trend analysis
- **Multimodal Analysis**: Text, image, video, and audio sentiment (foundation laid)

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Client Applications                       │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│              ML Inference Service (REST API)                 │
│                    Port: 3500                                │
└─────────────┬──────────────┬──────────────┬─────────────────┘
              │              │              │
              ▼              ▼              ▼
┌─────────────────┐ ┌──────────────┐ ┌──────────────────────┐
│   Sentiment     │ │  Narrative   │ │   Influence          │
│   Analysis      │ │  Tracking    │ │   Detection          │
│   Package       │ │  Package     │ │   Package            │
└────────┬────────┘ └──────┬───────┘ └──────┬───────────────┘
         │                 │                │
         ▼                 ▼                ▼
┌─────────────────────────────────────────────────────────────┐
│         BERT/RoBERTa Models (Transformers.js)                │
│         - Sentiment Analysis Model                           │
│         - Emotion Classification Model                       │
└─────────────────────────────────────────────────────────────┘
```

## Components

### 1. Sentiment Analysis Package

**Location**: `packages/sentiment-analysis/`

**Core Classes**:
- `SentimentAnalyzer`: Main orchestrator for sentiment analysis
- `BertSentimentModel`: BERT-based sentiment model
- `EmotionClassifier`: RoBERTa-based emotion classifier
- `SarcasmDetector`: Sarcasm and irony detection
- `AspectBasedAnalyzer`: Multi-aspect sentiment analysis
- `TemporalSentimentTracker`: Time-series sentiment tracking

**Features**:
- Overall sentiment scoring (positive, negative, neutral, compound)
- 7-class emotion detection
- Aspect-based sentiment for granular analysis
- Sarcasm and irony detection
- Temporal tracking with event detection
- Batch processing support

### 2. Narrative Tracking Package

**Location**: `packages/narrative-tracking/`

**Core Classes**:
- `NarrativeExtractor`: Extracts narratives from text
- `FramingAnalyzer`: Analyzes narrative framing
- `NarrativeTracker`: Tracks narratives over time
- `CounterNarrativeDetector`: Detects counter-narratives

**Features**:
- Story arc identification (exposition, rising action, climax, falling action, resolution)
- Narrative framing analysis (metaphors, causal, conflict, moral framing)
- Theme extraction
- Actor identification and role assignment
- Narrative evolution tracking
- Counter-narrative detection

### 3. Influence Detection Package

**Location**: `packages/influence-detection/`

**Core Classes**:
- `BotDetector`: Automated account detection
- `CIBDetector`: Coordinated inauthentic behavior detection
- `AstroturfingDetector`: Fake grassroots campaign detection
- `AmplificationDetector`: Amplification network identification

**Features**:
- Bot behavior pattern recognition
- Coordinated campaign detection
- Astroturfing indicators
- Amplification network tracing
- Network graph analysis

### 4. ML Inference Service

**Location**: `services/ml-inference/`

**Features**:
- REST API for all analysis capabilities
- Model initialization and management
- Batch processing support
- Health monitoring
- Error handling and logging

## Installation

### Prerequisites

- Node.js >= 18.18
- pnpm >= 9.12.0
- 8GB RAM minimum (16GB recommended for production)

### Setup

```bash
# Install dependencies
pnpm install

# Build packages
pnpm --filter @intelgraph/sentiment-analysis build
pnpm --filter @intelgraph/narrative-tracking build
pnpm --filter @intelgraph/influence-detection build
pnpm --filter @intelgraph/ml-inference build

# Start ML Inference Service
cd services/ml-inference
pnpm start
```

### Environment Variables

```bash
# ML Inference Service
ML_INFERENCE_PORT=3500
NODE_ENV=production

# Model Configuration
MODEL_CACHE_DIR=/path/to/model/cache
USE_GPU=false  # Set to true for GPU acceleration
BATCH_SIZE=8
```

## Usage

### Direct Package Usage

#### Sentiment Analysis

```typescript
import { SentimentAnalyzer } from '@intelgraph/sentiment-analysis';

const analyzer = new SentimentAnalyzer();
await analyzer.initialize();

const result = await analyzer.analyze(
  "This is a significant threat to national security",
  {
    includeEmotions: true,
    includeAspects: true,
    detectSarcasm: true,
    detectIrony: true
  }
);

console.log('Sentiment:', result.overallSentiment);
console.log('Emotions:', result.emotions);
console.log('Aspects:', result.aspects);
console.log('Sarcasm Score:', result.sarcasmScore);
```

#### Narrative Extraction

```typescript
import { NarrativeExtractor, FramingAnalyzer } from '@intelgraph/narrative-tracking';

const extractor = new NarrativeExtractor();
const framingAnalyzer = new FramingAnalyzer();

const narrative = await extractor.extractNarrative(
  "Your text here...",
  "source-id"
);

const framing = await framingAnalyzer.analyzeFraming(
  "Your text here..."
);

console.log('Narrative:', narrative);
console.log('Framing:', framing);
```

#### Bot Detection

```typescript
import { BotDetector } from '@intelgraph/influence-detection';

const detector = new BotDetector();

const result = await detector.detectBot({
  accountId: 'user123',
  creationDate: new Date('2024-01-01'),
  postCount: 500,
  followerCount: 50,
  followingCount: 1000,
  postingPattern: [5, 3, 2, 1, 0, 0, 0, 0, 1, 2, 4, 6, 8, 10, 12, 10, 8, 6, 4, 3, 2, 1, 1, 1],
  recentPosts: [/* ... */]
});

console.log('Bot Score:', result.botScore);
console.log('Classification:', result.classification);
console.log('Indicators:', result.indicators);
```

### REST API Usage

#### Sentiment Analysis

```bash
curl -X POST http://localhost:3500/api/sentiment/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "text": "This is a great development",
    "options": {
      "includeEmotions": true,
      "includeAspects": true
    }
  }'
```

#### Batch Analysis

```bash
curl -X POST http://localhost:3500/api/sentiment/analyze-batch \
  -H "Content-Type: application/json" \
  -d '{
    "texts": ["Text 1", "Text 2", "Text 3"],
    "options": {
      "includeEmotions": true
    }
  }'
```

#### Narrative Extraction

```bash
curl -X POST http://localhost:3500/api/narrative/extract \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Your narrative text...",
    "source": "news-article-123"
  }'
```

#### Bot Detection

```bash
curl -X POST http://localhost:3500/api/influence/bot-detection \
  -H "Content-Type: application/json" \
  -d '{
    "activity": {
      "accountId": "user123",
      "creationDate": "2024-01-01T00:00:00Z",
      "postCount": 500,
      "followerCount": 50,
      "followingCount": 1000,
      "postingPattern": [5,3,2,1,0,0,0,0,1,2,4,6,8,10,12,10,8,6,4,3,2,1,1,1],
      "recentPosts": []
    }
  }'
```

## API Reference

### Sentiment Analysis Endpoints

#### POST `/api/sentiment/analyze`
Analyze sentiment of a single text.

**Request**:
```json
{
  "text": "string",
  "options": {
    "includeEmotions": boolean,
    "includeAspects": boolean,
    "detectSarcasm": boolean,
    "detectIrony": boolean
  }
}
```

**Response**:
```json
{
  "text": "string",
  "overallSentiment": {
    "positive": number,
    "negative": number,
    "neutral": number,
    "compound": number
  },
  "emotions": {
    "anger": number,
    "fear": number,
    "joy": number,
    "sadness": number,
    "surprise": number,
    "disgust": number,
    "trust": number
  },
  "aspects": [],
  "sarcasmScore": number,
  "ironyScore": number,
  "subjectivity": number,
  "confidence": number,
  "timestamp": "ISO 8601 date"
}
```

### Narrative Analysis Endpoints

#### POST `/api/narrative/extract`
Extract narrative from text.

#### POST `/api/narrative/framing`
Analyze narrative framing.

#### GET `/api/narrative/active`
Get active narratives.

#### GET `/api/narrative/trending`
Get trending narratives.

### Influence Detection Endpoints

#### POST `/api/influence/bot-detection`
Detect bot behavior.

#### POST `/api/influence/cib-detection`
Detect coordinated inauthentic behavior.

#### POST `/api/influence/astroturfing`
Detect astroturfing campaigns.

#### POST `/api/influence/amplification`
Detect amplification networks.

## Integration

### With Graph Analytics

```typescript
import { SentimentAnalyzer } from '@intelgraph/sentiment-analysis';
// Assuming graph service integration

const analyzer = new SentimentAnalyzer();
await analyzer.initialize();

// Analyze sentiment for each node
for (const node of graphNodes) {
  const sentiment = await analyzer.analyze(node.content);

  // Update node with sentiment data
  await graphService.updateNode(node.id, {
    sentiment: sentiment.overallSentiment.compound,
    emotions: sentiment.emotions
  });
}
```

### With Event Stream

```typescript
import { TemporalSentimentTracker } from '@intelgraph/sentiment-analysis';

const tracker = new TemporalSentimentTracker();

// Track sentiment over time
eventStream.on('message', async (event) => {
  const sentiment = await analyzer.analyze(event.content);
  tracker.trackSentiment(event.entityId, sentiment.overallSentiment, event.timestamp);

  // Check for shifts
  const shifts = tracker.analyzeShifts(event.entityId);
  if (shifts.length > 0) {
    console.log('Sentiment shifts detected:', shifts);
  }
});
```

## Performance

### Throughput

- **Single Text Analysis**: ~50ms (CPU), ~10ms (GPU)
- **Batch Processing (8 texts)**: ~15ms per text (GPU)
- **Concurrent Requests**: Supports 100+ concurrent requests

### Resource Usage

- **Memory**: ~2GB for models in memory
- **CPU**: 2-4 cores recommended
- **GPU**: Optional, 4GB VRAM recommended

### Optimization Tips

1. **Use Batch Processing**: Process multiple texts in batches for better throughput
2. **Enable Quantization**: Reduce model size with minimal accuracy loss
3. **GPU Acceleration**: 5x faster inference with GPU
4. **Cache Results**: Cache frequently analyzed texts
5. **Adjust Batch Size**: Tune based on available memory

## Security

### Data Privacy

- Models run locally (no external API calls for core analysis)
- No data is sent to external services
- All processing happens in-memory

### Input Validation

- Text length limits enforced
- Malicious input sanitization
- Rate limiting on API endpoints

### Access Control

- API authentication required in production
- Role-based access control (RBAC)
- Audit logging for all operations

## Monitoring & Alerting

### Metrics

- Request count and latency
- Model inference time
- Error rates
- Memory and CPU usage

### Alerts

- Sudden sentiment shifts detected
- Coordinated campaigns identified
- Bot networks discovered
- Astroturfing campaigns detected

## Troubleshooting

### Common Issues

**Models fail to load**:
- Check available memory (need 2GB+)
- Verify network connectivity for model downloads
- Check disk space in model cache directory

**Slow inference**:
- Enable GPU acceleration if available
- Increase batch size
- Use quantized models

**High memory usage**:
- Reduce batch size
- Enable model quantization
- Clear old temporal data

## Support

For issues, questions, or contributions:
- GitHub Issues: [Create Issue](https://github.com/your-org/intelgraph/issues)
- Documentation: [Full Docs](https://docs.intelgraph.com)
- Email: support@intelgraph.com

## License

MIT License - See LICENSE file for details
