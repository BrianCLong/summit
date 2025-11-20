/**
 * @intelgraph/semantic-search
 *
 * Semantic search with dense vector embeddings and neural retrieval
 */

// Types
export * from './types.js';

// Embedding Models
export {
  SentenceTransformerModel,
  OpenAIEmbeddingModel,
  CohereEmbeddingModel,
} from './embeddings/SentenceTransformerModel.js';

// Cross-Encoders
export {
  TransformerCrossEncoder,
  CohereCrossEncoder,
  BM25CrossEncoder,
} from './models/CrossEncoder.js';

// Similarity Functions
export {
  CosineSimilarity,
  EuclideanSimilarity,
  DotProductSimilarity,
  ManhattanSimilarity,
  getSimilarityFunction,
  normalizeVector,
  bruteForceANN,
} from './utils/vectorSimilarity.js';

// Search Engine
export {
  SemanticSearchEngine,
  type SemanticSearchEngineConfig,
} from './retrieval/SemanticSearchEngine.js';
