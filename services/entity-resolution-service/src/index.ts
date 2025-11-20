/**
 * Entity Resolution Service - Main entry point
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import pino from 'pino';
import {
  EntityExtractor,
  EntityMatcher,
  EntityDeduplicator,
  EntityType,
  MatchingMethod,
  ClusteringMethod
} from '@summit/entity-resolution';

const app = express();
const logger = pino({ name: 'entity-resolution-service' });
const port = process.env.ER_SERVICE_PORT || 3101;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Initialize components
const extractor = new EntityExtractor({
  confidenceThreshold: 0.7,
  includeContext: true
});

const matcher = new EntityMatcher({
  threshold: 0.8,
  methods: [
    MatchingMethod.EXACT,
    MatchingMethod.FUZZY,
    MatchingMethod.PROBABILISTIC
  ]
});

const deduplicator = new EntityDeduplicator(
  {
    autoMergeThreshold: 0.95,
    reviewThreshold: 0.75,
    clusteringMethod: ClusteringMethod.CONNECTED_COMPONENTS,
    preserveProvenance: true
  },
  matcher
);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy' });
});

// Extract entities from text
app.post('/api/extract', async (req, res) => {
  try {
    const { text, types, confidenceThreshold } = req.body;

    const customExtractor = types || confidenceThreshold
      ? new EntityExtractor({ types, confidenceThreshold })
      : extractor;

    const result = await customExtractor.extract(text);
    res.json(result);
  } catch (error: any) {
    logger.error(error, 'Failed to extract entities');
    res.status(500).json({ error: error.message });
  }
});

// Match entities
app.post('/api/match', async (req, res) => {
  try {
    const { entity, candidates } = req.body;
    const matches = await matcher.findMatches(entity, candidates);
    res.json({ matches });
  } catch (error: any) {
    logger.error(error, 'Failed to match entities');
    res.status(500).json({ error: error.message });
  }
});

// Match pair of entities
app.post('/api/match/pair', async (req, res) => {
  try {
    const { entity1, entity2 } = req.body;
    const match = await matcher.matchPair(entity1, entity2);
    res.json(match || { score: 0, match: false });
  } catch (error: any) {
    logger.error(error, 'Failed to match entity pair');
    res.status(500).json({ error: error.message });
  }
});

// Deduplicate entities
app.post('/api/deduplicate', async (req, res) => {
  try {
    const { entities } = req.body;
    const results = await deduplicator.deduplicate(entities);
    const stats = deduplicator.getStatistics(results);

    res.json({
      results,
      statistics: stats
    });
  } catch (error: any) {
    logger.error(error, 'Failed to deduplicate entities');
    res.status(500).json({ error: error.message });
  }
});

// Merge entities
app.post('/api/merge', async (req, res) => {
  try {
    const { entities } = req.body;
    const merged = deduplicator.mergeEntities(entities);
    res.json(merged);
  } catch (error: any) {
    logger.error(error, 'Failed to merge entities');
    res.status(500).json({ error: error.message });
  }
});

// Batch extract and deduplicate
app.post('/api/batch/extract-deduplicate', async (req, res) => {
  try {
    const { texts } = req.body;

    // Extract entities from all texts
    const allEntities = [];
    for (const text of texts) {
      const result = await extractor.extract(text);
      allEntities.push(...result.entities);
    }

    // Deduplicate
    const results = await deduplicator.deduplicate(allEntities);
    const stats = deduplicator.getStatistics(results);

    res.json({
      totalExtracted: allEntities.length,
      results,
      statistics: stats
    });
  } catch (error: any) {
    logger.error(error, 'Failed to batch extract and deduplicate');
    res.status(500).json({ error: error.message });
  }
});

// Get entity types
app.get('/api/types', (req, res) => {
  res.json({
    types: Object.values(EntityType)
  });
});

// Get matching methods
app.get('/api/methods', (req, res) => {
  res.json({
    methods: Object.values(MatchingMethod)
  });
});

// Error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error(err, 'Unhandled error');
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(port, () => {
  logger.info(`Entity Resolution Service listening on port ${port}`);
});

// Handle shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

export { app };
