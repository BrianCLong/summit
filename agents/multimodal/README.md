# Multimodal Fusion Pipeline

> Agentic fusion of OSINT text/images/video into Neo4j embeddings using CLIP/ViT + pgvector

## Overview

This module provides a comprehensive multimodal fusion pipeline for intelligence analysis. It combines text, image, and video embeddings into unified vector representations suitable for cross-modal search and entity resolution.

### Key Features

- **CLIP/ViT Vision Pipeline**: Generate image embeddings using CLIP (Contrastive Language-Image Pre-training)
- **Text Embedding Pipeline**: Process text using transformer models (OpenAI, sentence-transformers)
- **Video Frame Analysis**: Extract key frames and generate temporal embeddings
- **Fusion Orchestration**: Multiple fusion strategies (concatenation, weighted average, attention, cross-modal transformer)
- **Hallucination Guards**: Detect cross-modal inconsistencies and semantic anomalies
- **Neo4j Graph Embeddings**: Enhance with graph structure using Node2Vec/GraphSAGE
- **pgvector Storage**: High-performance vector storage with HNSW indexes

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Fusion Orchestrator                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│  │    Text     │  │    CLIP     │  │   Video     │            │
│  │  Pipeline   │  │  Pipeline   │  │  Pipeline   │            │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘            │
│         │                │                │                    │
│         └────────────────┼────────────────┘                    │
│                          ▼                                     │
│              ┌───────────────────────┐                         │
│              │   Fusion Engine       │                         │
│              │  (weighted_average,   │                         │
│              │   attention, etc.)    │                         │
│              └───────────┬───────────┘                         │
│                          │                                     │
│         ┌────────────────┼────────────────┐                    │
│         ▼                ▼                ▼                    │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│  │Hallucination│  │   Neo4j     │  │  pgvector   │            │
│  │   Guard     │  │ Embeddings  │  │   Store     │            │
│  └─────────────┘  └─────────────┘  └─────────────┘            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Installation

```bash
pnpm add @intelgraph/multimodal-fusion
```

## Quick Start

```typescript
import { createOSINTFusionPipeline } from '@intelgraph/multimodal-fusion';

// Create pipeline
const pipeline = createOSINTFusionPipeline({
  enableGraphEmbeddings: true,
  enablePgVectorStorage: true,
});

// Initialize connections
await pipeline.initialize();

// Process multimodal sources
const fusedEmbedding = await pipeline.processJob(
  'investigation-123',
  [
    { type: 'text', uri: 'Intelligence report content...' },
    { type: 'image', uri: '/path/to/satellite-image.jpg' },
    { type: 'video', uri: '/path/to/surveillance.mp4' },
  ],
  'entity-suspect-001'
);

console.log('Fused embedding dimension:', fusedEmbedding.fusedDimension);
console.log('Cross-modal score:', fusedEmbedding.crossModalScore);
console.log('Hallucination score:', fusedEmbedding.hallucinationScore);
```

## API Reference

### FusionOrchestrator

Main orchestration class for multimodal fusion.

```typescript
const orchestrator = new FusionOrchestrator({
  clipModel: 'clip-vit-large-patch14',
  textModel: 'text-embedding-3-small',
  fusionMethod: 'weighted_average',
  targetDimension: 768,
  hallucinationThreshold: 0.7,
  crossModalThreshold: 0.6,
  enableGraphEmbeddings: true,
  enablePgVectorStorage: true,
  enableHallucinationGuard: true,
  parallelProcessing: true,
  maxConcurrency: 4,
});
```

#### Methods

- `initialize()`: Initialize all connections
- `processJob(investigationId, sources, entityId?)`: Process a single fusion job
- `processBatch(investigationId, sourceGroups)`: Process multiple entities
- `searchSimilar(queryVector, options)`: Search for similar embeddings
- `getMetrics()`: Get pipeline metrics
- `close()`: Close all connections

### CLIPPipeline

Vision embedding using CLIP models.

```typescript
const clipPipeline = new CLIPPipeline({
  model: 'clip-vit-large-patch14',
  enableObjectDetection: true,
  enableFaceDetection: true,
  enableOCR: false,
});

const imageEmbedding = await clipPipeline.embedImage(
  '/path/to/image.jpg',
  'investigation-123'
);
```

### TextPipeline

Text embedding with entity extraction.

```typescript
const textPipeline = new TextPipeline({
  model: 'text-embedding-3-small',
  enableEntityExtraction: true,
  enableSentimentAnalysis: false,
});

const textEmbedding = await textPipeline.embedText(
  'Intelligence report content...',
  'investigation-123'
);

// Extract entities
const entities = await textPipeline.extractEntities(text);
// Returns: [{ type: 'EMAIL', text: 'test@example.com', ... }]
```

### VideoPipeline

Video analysis with key frame extraction.

```typescript
const videoPipeline = new VideoPipeline({
  frameExtractionMode: 'scene_change',
  maxFrames: 100,
  enableObjectTracking: true,
});

const videoEmbedding = await videoPipeline.embedVideo(
  '/path/to/video.mp4',
  'investigation-123'
);
```

### HallucinationGuard

Detect cross-modal inconsistencies.

```typescript
const guard = new HallucinationGuard({
  crossModalThreshold: 0.6,
  autoRejectThreshold: 0.8,
});

const result = await guard.validate(fusedEmbedding, sourceEmbeddings);

if (result.isHallucination) {
  console.log('Hallucination detected:', result.reasons);
  // [{ type: 'cross_modal_mismatch', description: '...', severity: 'high' }]
}
```

### PgVectorStore

High-performance vector storage.

```typescript
const store = new PgVectorStore({
  tableName: 'multimodal_embeddings',
  dimension: 768,
  indexType: 'hnsw',
  distanceMetric: 'cosine',
});

await store.initialize();
await store.store(fusedEmbedding);

const similar = await store.search(queryVector, {
  topK: 10,
  threshold: 0.7,
  investigationId: 'inv-123',
});
```

### Neo4jEmbeddings

Graph-aware embeddings.

```typescript
const neo4j = new Neo4jEmbeddings({
  algorithm: 'node2vec',
  dimensions: 128,
  walkLength: 80,
  numWalks: 10,
});

await neo4j.initialize();

const graphEmbedding = await neo4j.embedNode(
  'entity-123',
  'investigation-123'
);
```

## Fusion Methods

| Method | Description | Best For |
|--------|-------------|----------|
| `concatenation` | Concatenate all modality vectors | Maximum information retention |
| `average` | Simple average of vectors | Equal modality importance |
| `weighted_average` | Confidence-weighted average | Variable quality sources |
| `attention` | Cross-modal attention weights | Complex multimodal fusion |
| `cross_modal_transformer` | Transformer-based fusion | State-of-the-art accuracy |

## Events

The orchestrator emits events for monitoring:

```typescript
orchestrator.onEvent({
  onJobStarted: (jobId) => console.log('Started:', jobId),
  onModalityProcessed: (jobId, modality, sourceId) => {
    console.log(`Processed ${modality}:`, sourceId);
  },
  onFusionCompleted: (jobId, entityId, embeddingId) => {
    console.log('Fusion complete:', entityId);
  },
  onHallucinationDetected: (jobId, sourceId, score) => {
    console.warn('Hallucination detected:', score);
  },
  onJobCompleted: (jobId, total) => console.log('Done:', total),
  onJobFailed: (jobId, error) => console.error('Failed:', error),
});
```

## Performance

### Benchmarks

| Operation | Latency (p50) | Throughput |
|-----------|---------------|------------|
| Text embedding | 50ms | 20/sec |
| Image embedding (CLIP) | 150ms | 7/sec |
| Video embedding (100 frames) | 5s | 0.2/sec |
| Fusion (3 modalities) | 200ms | 5/sec |
| Vector search (HNSW) | 5ms | 200/sec |

### Optimization Tips

1. **Enable parallel processing** for batch operations
2. **Use HNSW indexes** for vector search (faster than IVFFlat)
3. **Cache embeddings** for repeated queries
4. **Adjust frame extraction** for videos (scene_change mode is most efficient)
5. **Set appropriate hallucination thresholds** to balance accuracy vs. false positives

## Testing

```bash
# Run all tests
pnpm test

# Run with coverage
pnpm test:coverage

# Watch mode
pnpm test:watch
```

## Configuration

### Environment Variables

```bash
# Embedding APIs
OPENAI_API_KEY=sk-...
EMBEDDING_API_URL=https://api.openai.com
VISION_API_URL=http://localhost:8080

# Neo4j
NEO4J_URI=bolt://localhost:7687
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=password
NEO4J_DATABASE=neo4j

# PostgreSQL (pgvector)
DATABASE_URL=postgresql://user:pass@localhost:5432/intelgraph

# Video processing
FFMPEG_PATH=/usr/bin/ffmpeg
VIDEO_TEMP_DIR=/tmp/video-frames

# Caching
EMBEDDING_CACHE_PATH=/tmp/embedding-cache
```

## License

MIT
