# Sentiment Analysis Pipeline

This guide describes how Summit's ML engine performs sentiment analysis for
text content ingested through the feed processor.  The integration combines a
Hugging Face transformer model (with a deterministic lexical fallback) and
persists the results to Neo4j so they can be queried through GraphQL.

## Components

- **Python model (`server/ml/models/sentiment_analysis.py`)** – wraps a
  transformer pipeline and exposes a CLI that returns normalized JSON.  When
  the `transformers` package or a GPU is not available the module falls back to
  a keyword-based classifier so the rest of the system continues to function.
- **Feed processor integration (`services/feed-processor/src/index.ts`)** –
  detects rich text fields in incoming records, invokes the Python model via a
  subprocess, and stores the results in Neo4j alongside the entity node.
- **GraphQL resolver (`server/src/graphql/resolvers/core.ts`)** – exposes the
  `entitySentiment` query which returns the most recent sentiment insight for
  an entity.
- **Persistence (`server/src/repos/EntityRepo.ts`)** – maps Neo4j
  `SentimentResult` nodes to the `SentimentInsight` GraphQL type.

## Running the model directly

The Python module can be executed as a standalone CLI.  Pass the text as
Base64-encoded UTF-8 to avoid shell escaping issues:

```bash
python3 server/ml/models/sentiment_analysis.py \
  --text-base64 "$(printf '%s' 'The release looks fantastic!' | base64)"
```

Sample output:

```json
{
  "label": "positive",
  "confidence": 0.92,
  "score": 0.92,
  "method": "transformer",
  "model": "cardiffnlp/twitter-roberta-base-sentiment-latest",
  "probabilities": {"positive": 0.92, "neutral": 0.05, "negative": 0.03},
  "computed_at": "2026-01-12T20:00:00Z"
}
```

The CLI supports `--input-file` with a JSON array for batch jobs and
`--metadata` for attaching contextual information.

## Feed processor behaviour

1. Each ingested entity is scanned for text-rich fields such as `text`,
   `content`, `description`, `message`, etc.
2. If a candidate string longer than 20 characters is found, the service spawns
   the Python CLI (configurable via `SENTIMENT_SCRIPT_PATH` and
   `ML_PYTHON_PATH`).
3. The resulting JSON payload is stored in Neo4j as a `SentimentResult` node and
   linked to the entity with a `HAS_SENTIMENT` relationship.  Summary fields are
   also copied onto the entity (`sentiment_label`, `sentiment_confidence`,
   `sentiment_score`).
4. When the Python process is unavailable the worker logs a warning and
   gracefully disables future attempts for the remainder of the process.

## Querying via GraphQL

Use the `entitySentiment` query to fetch the most recent analysis for a given
entity.  Tenancy enforcement mirrors the other CRUD queries.

```graphql
query GetEntitySentiment($entityId: ID!, $tenantId: ID!) {
  entitySentiment(entityId: $entityId, tenantId: $tenantId) {
    label
    confidence
    score
    method
    model
    computedAt
    textSample
  }
}
```

## Testing

Run the dedicated pytest suite to validate the sentiment model without
downloading large transformer weights:

```bash
pytest server/ml/tests/test_sentiment_analysis.py
```

The tests rely on a deterministic dummy pipeline to exercise both the
transformer path and the lexical fallback logic.

