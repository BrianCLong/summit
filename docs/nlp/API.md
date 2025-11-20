# NLP Platform API Documentation

## REST API Endpoints

Base URL: `http://localhost:3010/api`

### Health Check

```http
GET /health
```

Response:
```json
{
  "status": "healthy",
  "service": "nlp-service",
  "timestamp": "2025-11-20T00:00:00.000Z"
}
```

### Text Preprocessing

#### Preprocess Text

```http
POST /api/nlp/preprocess
Content-Type: application/json

{
  "text": "Your text here",
  "options": {
    "lowercase": true,
    "removeStopwords": true,
    "lemmatize": false
  }
}
```

#### Tokenize Text

```http
POST /api/nlp/tokenize
Content-Type: application/json

{
  "text": "Natural language processing is amazing!",
  "type": "words"
}
```

#### Detect Language

```http
POST /api/nlp/detect-language
Content-Type: application/json

{
  "text": "Bonjour le monde"
}
```

Response:
```json
{
  "language": "fr",
  "confidence": 0.95,
  "allLanguages": [
    { "language": "fr", "confidence": 0.95 },
    { "language": "en", "confidence": 0.05 }
  ]
}
```

### Entity Extraction

#### Extract Named Entities

```http
POST /api/entities/extract
Content-Type: application/json

{
  "text": "Apple Inc. was founded by Steve Jobs in Cupertino, California.",
  "options": {
    "minConfidence": 0.7,
    "includeNested": true
  }
}
```

Response:
```json
{
  "entities": [
    {
      "text": "Apple Inc.",
      "type": "ORGANIZATION",
      "start": 0,
      "end": 10,
      "confidence": 0.95
    },
    {
      "text": "Steve Jobs",
      "type": "PERSON",
      "start": 26,
      "end": 36,
      "confidence": 0.98
    },
    {
      "text": "Cupertino, California",
      "type": "LOCATION",
      "start": 40,
      "end": 61,
      "confidence": 0.92
    }
  ]
}
```

### Sentiment Analysis

#### Analyze Sentiment

```http
POST /api/sentiment/analyze
Content-Type: application/json

{
  "text": "This product is absolutely amazing! I love it."
}
```

Response:
```json
{
  "sentiment": "positive",
  "score": 0.92,
  "confidence": 0.95,
  "emotions": [
    { "emotion": "joy", "score": 0.85, "confidence": 0.9 }
  ]
}
```

#### Aspect-Based Sentiment

```http
POST /api/sentiment/aspects
Content-Type: application/json

{
  "text": "The camera quality is excellent, but the battery life is disappointing.",
  "aspects": ["camera", "battery"]
}
```

### Topic Modeling

#### LDA Topic Modeling

```http
POST /api/topics/lda
Content-Type: application/json

{
  "documents": [
    "Machine learning is a subset of artificial intelligence...",
    "Deep learning uses neural networks with multiple layers...",
    "Natural language processing enables computers to understand text..."
  ],
  "numTopics": 3
}
```

#### Document Clustering

```http
POST /api/topics/cluster
Content-Type: application/json

{
  "documents": ["doc1", "doc2", "doc3"],
  "k": 2
}
```

### Summarization

#### Extractive Summarization

```http
POST /api/summarization/extractive
Content-Type: application/json

{
  "text": "Long text to summarize...",
  "maxSentences": 3
}
```

#### Abstractive Summarization

```http
POST /api/summarization/abstractive
Content-Type: application/json

{
  "text": "Long text to summarize...",
  "maxLength": 150
}
```

## Rate Limiting

The API is rate-limited to 100 requests per 15 minutes per IP address.

## Error Responses

All endpoints may return the following error responses:

### 400 Bad Request

```json
{
  "error": "Text is required"
}
```

### 429 Too Many Requests

```json
{
  "error": "Too many requests from this IP, please try again later."
}
```

### 500 Internal Server Error

```json
{
  "error": "Internal server error",
  "message": "Error details (in development mode only)"
}
```
