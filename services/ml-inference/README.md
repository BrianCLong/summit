# ML Inference Service

REST API service for sentiment analysis, narrative tracking, and influence detection.

## Features

- Sentiment analysis API
- Narrative extraction API
- Influence detection API
- Batch processing
- Health monitoring

## Installation

```bash
cd services/ml-inference
pnpm install
pnpm build
```

## Running

```bash
pnpm start
```

The service will start on port 3500 by default.

## API Endpoints

- `POST /api/sentiment/analyze` - Analyze sentiment
- `POST /api/narrative/extract` - Extract narrative
- `POST /api/influence/bot-detection` - Detect bots
- `GET /health` - Health check

## Documentation

See [docs/analytics/SENTIMENT_ANALYSIS.md](../../docs/analytics/SENTIMENT_ANALYSIS.md) for full API documentation.

## License

MIT
