/**
 * @intelgraph/graph-ai-core
 * Shared types and utilities for Graph XAI across services and clients
 */

import { z } from 'zod';

// Core XAI Types
export const ExplanationSchema = z.object({
  id: z.string(),
  subject_type: z.enum(['entity', 'edge']),
  subject_id: z.string(),
  model: z.string(),
  version: z.string(),
  rationale: z.string(),
  counterfactuals: z.array(z.string()),
  fairness_score: z.number().optional(),
  robustness_score: z.number().optional(),
  confidence: z.number().min(0).max(1),
  created_at: z.string().datetime(),
  cache_ttl: z.number(),
});

export type Explanation = z.infer<typeof ExplanationSchema>;

export const ModelCardSchema = z.object({
  model: z.string(),
  version: z.string(),
  dataset: z.string(),
  training_date: z.string().datetime(),
  metrics: z.record(z.string(), z.number()),
  fairness_tests: z.record(z.string(), z.any()),
  robustness_tests: z.record(z.string(), z.any()),
});

export type ModelCard = z.infer<typeof ModelCardSchema>;

// Request/Response Schemas
export const ExplainEntityRequestSchema = z.object({
  entityId: z.string(),
  model: z.string(),
  version: z.string(),
  locale: z.string().optional().default('en'),
});

export type ExplainEntityRequest = z.infer<typeof ExplainEntityRequestSchema>;

export const ExplainEdgeRequestSchema = z.object({
  edgeId: z.string(),
  model: z.string(),
  version: z.string(),
  locale: z.string().optional().default('en'),
});

export type ExplainEdgeRequest = z.infer<typeof ExplainEdgeRequestSchema>;

export const CounterfactualRequestSchema = z.object({
  entityId: z.string().optional(),
  edgeId: z.string().optional(),
  model: z.string(),
  version: z.string(),
  constraints: z.record(z.string(), z.any()).optional(),
});

export type CounterfactualRequest = z.infer<typeof CounterfactualRequestSchema>;

// Client SDK
export class GraphXAIClient {
  constructor(
    private baseUrl: string,
    private headers: Record<string, string> = {},
  ) {}

  async explainEntity(request: ExplainEntityRequest): Promise<Explanation> {
    const response = await fetch(`${this.baseUrl}/explain/entity`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...this.headers,
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`XAI service error: ${response.status}`);
    }

    const data = await response.json();
    return ExplanationSchema.parse(data);
  }

  async explainEdge(request: ExplainEdgeRequest): Promise<Explanation> {
    const response = await fetch(`${this.baseUrl}/explain/edge`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...this.headers,
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`XAI service error: ${response.status}`);
    }

    const data = await response.json();
    return ExplanationSchema.parse(data);
  }

  async generateCounterfactuals(request: CounterfactualRequest) {
    const response = await fetch(`${this.baseUrl}/counterfactuals`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...this.headers,
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`XAI service error: ${response.status}`);
    }

    return response.json();
  }

  async getModelCard(model: string, version = 'latest'): Promise<ModelCard> {
    const response = await fetch(
      `${this.baseUrl}/models/${model}/card?version=${version}`,
      {
        headers: this.headers,
      },
    );

    if (!response.ok) {
      throw new Error(`XAI service error: ${response.status}`);
    }

    const data = await response.json();
    return ModelCardSchema.parse(data);
  }

  async getFairnessMetrics(model: string, version: string) {
    const response = await fetch(
      `${this.baseUrl}/fairness/${model}/${version}`,
      {
        headers: this.headers,
      },
    );

    if (!response.ok) {
      throw new Error(`XAI service error: ${response.status}`);
    }

    return response.json();
  }

  async getRobustnessMetrics(model: string, version: string) {
    const response = await fetch(
      `${this.baseUrl}/robustness/${model}/${version}`,
      {
        headers: this.headers,
      },
    );

    if (!response.ok) {
      throw new Error(`XAI service error: ${response.status}`);
    }

    return response.json();
  }
}

// Utility functions
export function createXAIClient(
  baseUrl: string,
  authorityId?: string,
  reasonForAccess?: string,
): GraphXAIClient {
  const headers: Record<string, string> = {};

  if (authorityId) {
    headers['X-Authority-ID'] = authorityId;
  }

  if (reasonForAccess) {
    headers['X-Reason-For-Access'] = reasonForAccess;
  }

  return new GraphXAIClient(baseUrl, headers);
}

export function getCacheKey(
  subjectId: string,
  model: string,
  version: string,
  locale = 'en',
): string {
  return `xai:${subjectId}:${model}:${version}:${locale}`;
}

// Constants
export const XAI_MODELS = {
  GNN_V1: 'gnn-v1',
  GNN_V2: 'gnn-v2',
  TRANSFORMER_V1: 'transformer-v1',
  TRANSFORMER_V2: 'transformer-v2',
  HYBRID_V1: 'hybrid-v1',
} as const;

export const XAI_SUPPORTED_LOCALES = ['en', 'es', 'fr', 'de', 'zh'] as const;

export type XAIModel = (typeof XAI_MODELS)[keyof typeof XAI_MODELS];
export type XAILocale = (typeof XAI_SUPPORTED_LOCALES)[number];
