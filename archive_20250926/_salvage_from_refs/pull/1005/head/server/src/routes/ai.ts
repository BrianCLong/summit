/**
 * AI API Endpoints for IntelGraph
 * Provides endpoints for link prediction, sentiment analysis, and AI-powered insights
 */

import express, { Request, Response } from 'express';
import { body, query, validationResult } from 'express-validator';
import rateLimit from 'express-rate-limit';
import pino from 'pino';

const logger = pino();
const router = express.Router();

// Rate limiting for AI endpoints (more restrictive due to computational cost)
const aiRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // Limit each IP to 50 requests per windowMs
  message: {
    error: 'Too many AI requests, please try again later',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiting to all AI routes
router.use(aiRateLimit);

// Validation middleware
const validatePredictLinks = [
  body('entityId').isString().notEmpty().withMessage('entityId is required'),
  body('entities').optional().isArray().withMessage('entities must be an array'),
  body('relationships').optional().isArray().withMessage('relationships must be an array'),
  body('topK').optional().isInt({ min: 1, max: 50 }).withMessage('topK must be between 1 and 50'),
  body('threshold').optional().isFloat({ min: 0, max: 1 }).withMessage('threshold must be between 0 and 1')
];

const validateSentiment = [
  body('entityId').optional().isString().withMessage('entityId must be a string'),
  body('text').optional().isString().withMessage('text must be a string'),
  body('entityData').optional().isObject().withMessage('entityData must be an object')
];

const validateAISummary = [
  body('entityId').isString().notEmpty().withMessage('entityId is required'),
  body('entityData').optional().isObject().withMessage('entityData must be an object'),
  body('includeContext').optional().isBoolean().withMessage('includeContext must be boolean')
];

// Helper function to handle validation errors
const handleValidationErrors = (req: Request, res: Response, next: Function) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array()
    });
  }
  next();
};

/**
 * POST /api/ai/predict-links
 * Predict potential links between entities using GNN model
 */
router.post('/predict-links', validatePredictLinks, handleValidationErrors, async (req: Request, res: Response) => {
  try {
    const startTime = Date.now();
    const { entityId, entities = [], relationships = [], topK = 10, threshold = 0.5 } = req.body;

    logger.info(`Link prediction request for entity: ${entityId}`);

    // TODO: Replace with actual ML model integration
    // For now, return scaffold predictions
    const predictions = generateScaffoldLinkPredictions(entityId, entities, topK, threshold);

    const responseTime = Date.now() - startTime;
    
    // Log metrics
    logger.info(`Link prediction completed in ${responseTime}ms for entity ${entityId}`);

    res.json({
      success: true,
      entityId,
      predictions,
      metadata: {
        model: 'scaffold-gnn-v1',
        topK,
        threshold,
        executionTime: responseTime,
        totalCandidates: predictions.length
      }
    });

  } catch (error) {
    logger.error(`Error in link prediction: ${error instanceof Error ? error.message : 'Unknown error'}`);
    res.status(500).json({
      error: 'Link prediction failed',
      message: 'Internal server error during link prediction'
    });
  }
});

/**
 * POST /api/ai/analyze-sentiment
 * Analyze sentiment of text content or entity data
 */
router.post('/analyze-sentiment', validateSentiment, handleValidationErrors, async (req: Request, res: Response) => {
  try {
    const startTime = Date.now();
    const { entityId, text, entityData } = req.body;

    logger.info(`Sentiment analysis request${entityId ? ` for entity: ${entityId}` : ''}`);

    let sentimentResult;

    if (text) {
      // Analyze single text
      sentimentResult = generateScaffoldSentiment(text);
    } else if (entityData) {
      // Analyze entity content
      sentimentResult = generateScaffoldEntitySentiment(entityData);
    } else {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'Either text or entityData must be provided'
      });
    }

    const responseTime = Date.now() - startTime;

    logger.info(`Sentiment analysis completed in ${responseTime}ms`);

    res.json({
      success: true,
      entityId,
      sentiment: sentimentResult,
      metadata: {
        model: 'scaffold-sentiment-v1',
        executionTime: responseTime,
        analyzedFields: sentimentResult.field_sentiments ? Object.keys(sentimentResult.field_sentiments).length : 1
      }
    });

  } catch (error) {
    logger.error(`Error in sentiment analysis: ${error instanceof Error ? error.message : 'Unknown error'}`);
    res.status(500).json({
      error: 'Sentiment analysis failed',
      message: 'Internal server error during sentiment analysis'
    });
  }
});

/**
 * POST /api/ai/generate-summary
 * Generate AI-powered insights and summary for an entity
 */
router.post('/generate-summary', validateAISummary, handleValidationErrors, async (req: Request, res: Response) => {
  try {
    const startTime = Date.now();
    const { entityId, entityData, includeContext = true } = req.body;

    logger.info(`AI summary generation request for entity: ${entityId}`);

    // TODO: Replace with actual LLM integration
    const summary = generateScaffoldAISummary(entityId, entityData, includeContext);

    const responseTime = Date.now() - startTime;

    logger.info(`AI summary generated in ${responseTime}ms for entity ${entityId}`);

    res.json({
      success: true,
      entityId,
      summary,
      metadata: {
        model: 'scaffold-llm-v1',
        includeContext,
        executionTime: responseTime,
        generatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error(`Error in AI summary generation: ${error instanceof Error ? error.message : 'Unknown error'}`);
    res.status(500).json({
      error: 'AI summary generation failed',
      message: 'Internal server error during summary generation'
    });
  }
});

/**
 * GET /api/ai/models/status
 * Get status and health of AI models
 */
router.get('/models/status', async (req: Request, res: Response) => {
  try {
    // TODO: Replace with actual model health checks
    const modelStatus = {
      linkPrediction: {
        status: 'healthy',
        model: 'scaffold-gnn-v1',
        lastUpdated: new Date().toISOString(),
        version: '1.0.0-scaffold'
      },
      sentimentAnalysis: {
        status: 'healthy',
        model: 'scaffold-sentiment-v1',
        lastUpdated: new Date().toISOString(),
        version: '1.0.0-scaffold'
      },
      textGeneration: {
        status: 'healthy',
        model: 'scaffold-llm-v1',
        lastUpdated: new Date().toISOString(),
        version: '1.0.0-scaffold'
      }
    };

    res.json({
      success: true,
      models: modelStatus,
      overview: {
        totalModels: Object.keys(modelStatus).length,
        healthyModels: Object.values(modelStatus).filter(m => m.status === 'healthy').length,
        lastChecked: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error(`Error checking model status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    res.status(500).json({
      error: 'Model status check failed',
      message: 'Internal server error during model status check'
    });
  }
});

/**
 * GET /api/ai/capabilities
 * Get available AI capabilities and their parameters
 */
router.get('/capabilities', async (req: Request, res: Response) => {
  try {
    const capabilities = {
      linkPrediction: {
        description: 'Predict potential relationships between entities using graph neural networks',
        parameters: {
          topK: { type: 'integer', min: 1, max: 50, default: 10 },
          threshold: { type: 'float', min: 0, max: 1, default: 0.5 }
        },
        supportedEntityTypes: ['person', 'organization', 'event', 'location', 'document'],
        maxEntities: 1000
      },
      sentimentAnalysis: {
        description: 'Analyze sentiment of text content and entity descriptions',
        parameters: {
          language: { type: 'string', options: ['en'], default: 'en' }
        },
        supportedFields: ['description', 'notes', 'comments', 'content'],
        maxTextLength: 512
      },
      textGeneration: {
        description: 'Generate AI-powered insights and summaries for entities',
        parameters: {
          includeContext: { type: 'boolean', default: true },
          maxLength: { type: 'integer', min: 50, max: 1000, default: 200 }
        },
        supportedFormats: ['summary', 'insights', 'recommendations']
      }
    };

    res.json({
      success: true,
      capabilities,
      version: '1.0.0-scaffold',
      lastUpdated: new Date().toISOString()
    });

  } catch (error) {
    logger.error(`Error retrieving capabilities: ${error instanceof Error ? error.message : 'Unknown error'}`);
    res.status(500).json({
      error: 'Failed to retrieve capabilities',
      message: 'Internal server error'
    });
  }
});

// Scaffold helper functions (replace with actual ML integration)

function generateScaffoldLinkPredictions(entityId: string, entities: any[], topK: number, threshold: number) {
  const predictions = [];
  const entityIds = entities.map(e => e.id).filter(id => id !== entityId);

  for (let i = 0; i < Math.min(topK, entityIds.length); i++) {
    const targetId = entityIds[i];
    const confidence = Math.random() * 0.4 + 0.6; // Random confidence between 0.6-1.0

    if (confidence >= threshold) {
      predictions.push({
        from: entityId,
        to: targetId,
        confidence: parseFloat(confidence.toFixed(3)),
        reasoning: `Scaffold prediction based on random sampling (confidence: ${confidence.toFixed(3)})`,
        type: 'scaffold_prediction',
        features: {
          structural_similarity: Math.random() * 0.5 + 0.3,
          semantic_similarity: Math.random() * 0.5 + 0.3,
          temporal_correlation: Math.random() * 0.5 + 0.2
        }
      });
    }
  }

  return predictions.sort((a, b) => b.confidence - a.confidence);
}

function generateScaffoldSentiment(text: string) {
  // Simple keyword-based scaffold sentiment
  const positiveWords = ['good', 'great', 'excellent', 'positive', 'happy', 'success'];
  const negativeWords = ['bad', 'terrible', 'poor', 'negative', 'sad', 'failure'];

  const textLower = text.toLowerCase();
  const positiveCount = positiveWords.filter(word => textLower.includes(word)).length;
  const negativeCount = negativeWords.filter(word => textLower.includes(word)).length;

  let sentiment = 'neutral';
  let confidence = 0.7;

  if (positiveCount > negativeCount) {
    sentiment = 'positive';
    confidence = Math.min(0.6 + positiveCount * 0.1, 0.95);
  } else if (negativeCount > positiveCount) {
    sentiment = 'negative';
    confidence = Math.min(0.6 + negativeCount * 0.1, 0.95);
  }

  return {
    sentiment,
    confidence: parseFloat(confidence.toFixed(3)),
    scores: {
      positive: sentiment === 'positive' ? confidence : (1 - confidence) * 0.4,
      negative: sentiment === 'negative' ? confidence : (1 - confidence) * 0.4,
      neutral: sentiment === 'neutral' ? confidence : (1 - confidence) * 0.2
    },
    method: 'scaffold'
  };
}

function generateScaffoldEntitySentiment(entityData: any) {
  const textFields = [];
  const fieldMap: Record<string, any> = {};

  // Extract text from entity
  if (entityData.description) {
    textFields.push(entityData.description);
    fieldMap[textFields.length - 1] = 'description';
  }
  if (entityData.notes) {
    textFields.push(entityData.notes);
    fieldMap[textFields.length - 1] = 'notes';
  }

  if (textFields.length === 0) {
    return {
      overall_sentiment: 'neutral',
      overall_confidence: 0.0,
      field_sentiments: {},
      summary: 'No text content found for analysis'
    };
  }

  const fieldSentiments: Record<string, any> = {};
  const sentimentScores = { positive: [], negative: [], neutral: [] };

  textFields.forEach((text, index) => {
    const result = generateScaffoldSentiment(text);
    const fieldName = fieldMap[index];
    fieldSentiments[fieldName] = result;

    // Collect for aggregation
    Object.entries(result.scores).forEach(([sentiment, score]) => {
      (sentimentScores as any)[sentiment].push(score);
    });
  });

  // Calculate overall sentiment
  const avgScores: Record<string, number> = {};
  Object.entries(sentimentScores).forEach(([sentiment, scores]) => {
    avgScores[sentiment] = scores.length > 0 ? scores.reduce((a: number, b: number) => a + b, 0) / scores.length : 0;
  });

  const overallSentiment = Object.entries(avgScores).reduce((a, b) => avgScores[a[0]] > avgScores[b[0]] ? a : b)[0];
  const overallConfidence = avgScores[overallSentiment];

  return {
    overall_sentiment: overallSentiment,
    overall_confidence: parseFloat(overallConfidence.toFixed(3)),
    field_sentiments: fieldSentiments,
    summary: `Analyzed ${textFields.length} field(s). Overall sentiment: ${overallSentiment} (confidence: ${overallConfidence.toFixed(2)})`,
    analyzed_at: new Date().toISOString()
  };
}

function generateScaffoldAISummary(entityId: string, entityData: any, includeContext: boolean) {
  const entityType = entityData?.type || 'entity';
  const entityName = entityData?.name || entityId;

  const insights = [
    `${entityName} shows characteristics typical of ${entityType} entities`,
    'Scaffold analysis indicates normal behavior patterns',
    'No anomalies detected in current data set'
  ];

  const recommendations = [
    'Continue monitoring entity for changes',
    'Consider expanding data collection for deeper insights',
    'Review related entities for additional context'
  ];

  if (includeContext) {
    insights.push('Context analysis would provide additional insights when real ML models are integrated');
    recommendations.push('Implement context-aware analysis for enhanced predictions');
  }

  return {
    summary: `AI analysis of ${entityName}: This ${entityType} entity demonstrates standard patterns in the available data. Scaffold predictions suggest normal operational characteristics with no immediate concerns identified.`,
    insights,
    recommendations,
    confidence: 0.75,
    generatedBy: 'scaffold-ai-v1',
    timestamp: new Date().toISOString()
  };
}

export default router;