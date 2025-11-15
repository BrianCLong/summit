/**
 * AI Insights Client
 *
 * Node.js client for communicating with the AI Insights MVP-0 service
 * Provides entity resolution and link scoring capabilities
 */

import fetch from 'node-fetch';
import { getTracer } from '../otel';

interface Entity {
  id: string;
  name: string;
  type: string;
  attributes?: Record<string, any>;
  metadata?: Record<string, any>;
}

interface EntityPair {
  entity_a: Entity;
  entity_b: Entity;
  context?: string;
}

interface EntityMatch {
  entity_a_id: string;
  entity_b_id: string;
  confidence: number;
  features?: Record<string, number>;
  method: string;
}

interface LinkScore {
  entity_a_id: string;
  entity_b_id: string;
  score: number;
  confidence: number;
  features: Record<string, number>;
}

interface AIInsightsConfig {
  baseUrl: string;
  timeout: number;
  retries: number;
  featureFlagEnabled: boolean;
}

export class AIInsightsClient {
  private config: AIInsightsConfig;
  private tracer = getTracer('ai-insights-client');

  constructor(config: Partial<AIInsightsConfig> = {}) {
    this.config = {
      baseUrl: process.env.AI_INSIGHTS_URL || 'http://insight-ai:8000',
      timeout: 30000, // 30 seconds
      retries: 3,
      featureFlagEnabled: process.env.FEATURE_FLAG_AI_INSIGHTS === 'true',
      ...config,
    };

    console.log('🧠 AI Insights Client initialized:', {
      baseUrl: this.config.baseUrl,
      enabled: this.config.featureFlagEnabled,
    });
  }

  /**
   * Check if AI insights are enabled
   */
  isEnabled(): boolean {
    return this.config.featureFlagEnabled;
  }

  /**
   * Resolve similar entities
   */
  async resolveEntities(
    entities: Entity[],
    options: {
      threshold?: number;
      includeFeatures?: boolean;
    } = {},
  ): Promise<EntityMatch[]> {
    if (!this.isEnabled()) {
      console.log('🚫 AI Insights disabled, returning empty matches');
      return [];
    }

    return (this.tracer as any).startActiveSpan(
      'ai-insights.resolve-entities',
      async (span) => {
        try {
          span.setAttributes({
            'ai.service': 'entity-resolution',
            'ai.entities.count': entities.length,
            'ai.threshold': options.threshold || 0.8,
          });

          const request = {
            entities,
            threshold: options.threshold || 0.8,
            include_features: options.includeFeatures || false,
          };

          const response = await this.makeRequest('/resolve-entities', request);

          span.setAttributes({
            'ai.matches.count': response.matches.length,
            'ai.processing_time_ms': response.processing_time_ms,
            'ai.model_version': response.model_version,
          });

          console.log(
            `🎯 Entity resolution: ${response.matches.length} matches found in ${response.processing_time_ms}ms`,
          );

          return response.matches;
        } catch (error) {
          span.recordException(error as Error);
          console.error('❌ Entity resolution failed:', error);
          return []; // Fail gracefully
        } finally {
          span.end();
        }
      },
    );
  }

  /**
   * Score entity relationship links
   */
  async scoreLinks(
    entityPairs: EntityPair[],
    options: {
      includeConfidence?: boolean;
    } = {},
  ): Promise<LinkScore[]> {
    if (!this.isEnabled()) {
      console.log('🚫 AI Insights disabled, returning empty scores');
      return [];
    }

    return (this.tracer as any).startActiveSpan(
      'ai-insights.score-links',
      async (span) => {
        try {
          span.setAttributes({
            'ai.service': 'link-scoring',
            'ai.pairs.count': entityPairs.length,
          });

          const request = {
            entity_pairs: entityPairs,
            include_confidence: options.includeConfidence !== false,
          };

          const response = await this.makeRequest('/score-links', request);

          span.setAttributes({
            'ai.scores.count': response.scores.length,
            'ai.processing_time_ms': response.processing_time_ms,
            'ai.model_version': response.model_version,
          });

          console.log(
            `🔗 Link scoring: ${response.scores.length} scores computed in ${response.processing_time_ms}ms`,
          );

          return response.scores;
        } catch (error) {
          span.recordException(error as Error);
          console.error('❌ Link scoring failed:', error);
          return []; // Fail gracefully
        } finally {
          span.end();
        }
      },
    );
  }

  /**
   * Get AI service health
   */
  async getHealth(): Promise<{
    status: string;
    models_loaded: number;
    cache_status: string;
    feature_flags: Record<string, boolean>;
  } | null> {
    try {
      return await this.makeRequest('/health', null, 'GET');
    } catch (error) {
      console.error('❌ AI health check failed:', error);
      return null;
    }
  }

  /**
   * Batch entity resolution with automatic chunking
   */
  async batchResolveEntities(
    entities: Entity[],
    batchSize: number = 50,
    threshold: number = 0.8,
  ): Promise<EntityMatch[]> {
    if (!this.isEnabled()) {
      return [];
    }

    const allMatches: EntityMatch[] = [];

    for (let i = 0; i < entities.length; i += batchSize) {
      const batch = entities.slice(i, i + batchSize);
      const matches = await this.resolveEntities(batch, { threshold });
      allMatches.push(...matches);
    }

    return allMatches;
  }

  /**
   * Calculate AI score for a single entity (for GraphQL integration)
   */
  async calculateEntityScore(entity: Entity): Promise<number> {
    if (!this.isEnabled()) {
      return 0.5; // Default neutral score
    }

    try {
      // Create a simple scoring based on entity completeness and type
      let score = 0.3; // Base score

      // Name quality
      if (entity.name && entity.name.length > 2) {
        score += 0.2;
      }

      // Type specificity
      if (entity.type && entity.type !== 'unknown') {
        score += 0.2;
      }

      // Attributes richness
      const attrCount = Object.keys(entity.attributes || {}).length;
      score += Math.min(attrCount * 0.05, 0.3);

      // For MVP, return this simple calculation
      // In future versions, use ML model prediction
      return Math.min(score, 1.0);
    } catch (error) {
      console.error('❌ Entity scoring failed:', error);
      return 0.5;
    }
  }

  /**
   * Make HTTP request to AI service
   */
  private async makeRequest(
    endpoint: string,
    data: any,
    method: 'GET' | 'POST' = 'POST',
  ): Promise<any> {
    const url = `${this.config.baseUrl}${endpoint}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const options: any = {
        method,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'intelgraph-server/1.0',
        },
        signal: controller.signal,
      };

      if (method === 'POST' && data) {
        options.body = JSON.stringify(data);
      }

      const response = await fetch(url, options);

      if (!response.ok) {
        throw new Error(
          `AI service responded with ${response.status}: ${response.statusText}`,
        );
      }

      return await response.json();
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error(
          `AI service request timeout after ${this.config.timeout}ms`,
        );
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }
}

// Singleton instance
let aiInsightsClient: AIInsightsClient | null = null;

export function getAIInsightsClient(): AIInsightsClient {
  if (!aiInsightsClient) {
    aiInsightsClient = new AIInsightsClient();
  }
  return aiInsightsClient;
}

// Health check for application startup
export async function validateAIInsightsConnection(): Promise<boolean> {
  const client = getAIInsightsClient();

  if (!client.isEnabled()) {
    console.log('ℹ️  AI Insights is disabled via feature flag');
    return true; // Not an error if disabled
  }

  try {
    const health = await client.getHealth();
    if (health && health.status === 'healthy') {
      console.log('✅ AI Insights service is healthy');
      return true;
    } else {
      console.warn('⚠️  AI Insights service is not healthy:', health);
      return false;
    }
  } catch (error) {
    console.error(
      '❌ Failed to connect to AI Insights service:',
      error.message,
    );
    return false;
  }
}
