/**
 * AI API Schemas and Documentation
 */

import { z } from 'zod';
import { registry, ErrorResponseSchema } from '../spec.js';

// AI Analysis Request Schema
export const AIAnalysisRequestSchema = registry.register(
  'AIAnalysisRequest',
  z
    .object({
      text: z.string().min(1).max(100000).describe('Text to analyze'),
      analysisType: z
        .enum(['sentiment', 'entities', 'summary', 'classification'])
        .describe('Type of analysis to perform'),
      options: z
        .object({
          language: z.string().optional().describe('Language code (e.g., en, es)'),
          model: z.string().optional().describe('AI model to use'),
        })
        .optional(),
    })
    .openapi({ description: 'AI analysis request' }),
);

// AI Analysis Response Schema
export const AIAnalysisResponseSchema = registry.register(
  'AIAnalysisResponse',
  z
    .object({
      ok: z.boolean(),
      result: z.any().describe('Analysis results'),
      confidence: z.number().min(0).max(1).optional(),
      metadata: z
        .object({
          processingTime: z.number(),
          model: z.string(),
          timestamp: z.string().datetime(),
        })
        .optional(),
    })
    .openapi({ description: 'AI analysis response' }),
);

// Link Prediction Schema
export const LinkPredictionRequestSchema = registry.register(
  'LinkPredictionRequest',
  z
    .object({
      sourceEntityId: z.string().uuid().describe('Source entity ID'),
      targetEntityId: z.string().uuid().optional().describe('Target entity ID'),
      relationshipTypes: z.array(z.string()).optional(),
      maxResults: z.number().int().min(1).max(100).default(10),
    })
    .openapi({ description: 'Link prediction request' }),
);

export const LinkPredictionResponseSchema = registry.register(
  'LinkPredictionResponse',
  z
    .object({
      ok: z.boolean(),
      predictions: z.array(
        z.object({
          targetEntityId: z.string().uuid(),
          relationshipType: z.string(),
          confidence: z.number().min(0).max(1),
          evidence: z.array(z.string()).optional(),
        }),
      ),
    })
    .openapi({ description: 'Link prediction response' }),
);

// Register AI endpoints
registry.registerPath({
  method: 'post',
  path: '/api/ai/analyze',
  description: 'Analyze text using AI models',
  summary: 'AI text analysis',
  tags: ['AI'],
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: {
        'application/json': {
          schema: AIAnalysisRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Analysis completed successfully',
      content: {
        'application/json': {
          schema: AIAnalysisResponseSchema,
        },
      },
    },
    400: {
      description: 'Invalid request',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
    429: {
      description: 'Rate limit exceeded',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
  },
});

registry.registerPath({
  method: 'post',
  path: '/api/ai/link-prediction',
  description: 'Predict likely relationships between entities',
  summary: 'Link prediction',
  tags: ['AI'],
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: {
        'application/json': {
          schema: LinkPredictionRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Prediction completed successfully',
      content: {
        'application/json': {
          schema: LinkPredictionResponseSchema,
        },
      },
    },
    400: {
      description: 'Invalid request',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
  },
});
