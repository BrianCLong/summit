# @intelgraph/sentiment-analysis

AI-powered sentiment analysis with BERT/RoBERTa for intelligence operations.

## Features

- Text sentiment analysis (positive, negative, neutral)
- 7-class emotion classification
- Aspect-based sentiment analysis
- Sarcasm and irony detection
- Temporal sentiment tracking
- Batch processing

## Installation

```bash
pnpm add @intelgraph/sentiment-analysis
```

## Quick Start

```typescript
import { SentimentAnalyzer } from '@intelgraph/sentiment-analysis';

const analyzer = new SentimentAnalyzer();
await analyzer.initialize();

const result = await analyzer.analyze("This is a great development!");

console.log(result.overallSentiment);
console.log(result.emotions);
```

## Documentation

See [docs/analytics/SENTIMENT_ANALYSIS.md](../../docs/analytics/SENTIMENT_ANALYSIS.md) for full documentation.

## License

MIT
