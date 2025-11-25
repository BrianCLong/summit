/**
 * AI-Powered Data Enrichment Pipelines for Switchboard
 * Pluggable AI enrichment stages that preprocess incoming data for
 * entity extraction, anomaly detection, and semantic tagging before ingestion into Summit.
 */

import { z } from 'zod';
import { EventEmitter } from 'events';
import { SwitchboardContext } from './types';

// Enrichment stage types
export const EnrichmentStageTypeSchema = z.enum([
  'entity_extraction',
  'sentiment_analysis',
  'anomaly_detection',
  'semantic_tagging',
  'classification',
  'summarization',
  'translation',
  'pii_detection',
  'topic_modeling',
  'relationship_extraction',
  'custom',
]);

export type EnrichmentStageType = z.infer<typeof EnrichmentStageTypeSchema>;

// Enrichment stage configuration
export const EnrichmentStageConfigSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: EnrichmentStageTypeSchema,
  enabled: z.boolean().default(true),
  order: z.number().int().min(0).default(0),

  // Model configuration
  model: z.object({
    provider: z.enum(['openai', 'anthropic', 'local', 'custom']),
    modelId: z.string(),
    endpoint: z.string().url().optional(),
    apiKey: z.string().optional(), // Should use secrets in production
    temperature: z.number().min(0).max(2).default(0.3),
    maxTokens: z.number().int().min(1).default(1000),
  }).optional(),

  // Input/output configuration
  inputFields: z.array(z.string()).optional(), // Fields to process
  outputField: z.string().optional(), // Where to store results
  appendToPayload: z.boolean().default(true),

  // Processing options
  options: z.record(z.unknown()).optional(),
  timeout: z.number().int().min(100).default(30000),
  retryOnFailure: z.boolean().default(true),
  maxRetries: z.number().int().min(0).max(5).default(2),

  // Filtering
  filterCondition: z.string().optional(), // JSONPath expression to filter events
});

export type EnrichmentStageConfig = z.infer<typeof EnrichmentStageConfigSchema>;

// Enrichment result
export interface EnrichmentResult {
  stageId: string;
  stageName: string;
  stageType: EnrichmentStageType;
  success: boolean;
  data: Record<string, unknown>;
  confidence?: number;
  processingTimeMs: number;
  error?: string;
  metadata?: Record<string, unknown>;
}

// Pipeline configuration
export const EnrichmentPipelineConfigSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  enabled: z.boolean().default(true),
  stages: z.array(EnrichmentStageConfigSchema),
  parallelExecution: z.boolean().default(false),
  stopOnError: z.boolean().default(false),
  timeout: z.number().int().min(1000).default(60000),
});

export type EnrichmentPipelineConfig = z.infer<typeof EnrichmentPipelineConfigSchema>;

// Pipeline result
export interface PipelineResult {
  pipelineId: string;
  pipelineName: string;
  success: boolean;
  stageResults: EnrichmentResult[];
  enrichedPayload: Record<string, unknown>;
  totalProcessingTimeMs: number;
  timestamp: number;
}

// Entity extraction types
export interface ExtractedEntity {
  text: string;
  type: 'person' | 'organization' | 'location' | 'date' | 'money' | 'email' | 'phone' | 'url' | 'custom';
  confidence: number;
  startIndex: number;
  endIndex: number;
  metadata?: Record<string, unknown>;
}

// Anomaly detection types
export interface AnomalyResult {
  isAnomaly: boolean;
  score: number; // 0-1, higher = more anomalous
  type?: string;
  explanation?: string;
  features?: Record<string, number>;
}

// Semantic tag
export interface SemanticTag {
  tag: string;
  confidence: number;
  category?: string;
}

// Stage processor interface
type StageProcessor = (
  payload: Record<string, unknown>,
  config: EnrichmentStageConfig,
  context: SwitchboardContext
) => Promise<EnrichmentResult>;

interface EnrichmentPipelineOptions {
  logger?: Logger;
  metrics?: MetricsClient;
  defaultModelProvider?: EnrichmentStageConfig['model']['provider'];
  defaultModelId?: string;
  modelEndpoints?: Record<string, string>;
}

interface Logger {
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
  debug(message: string, meta?: Record<string, unknown>): void;
}

interface MetricsClient {
  increment(metric: string, tags?: Record<string, string>): void;
  histogram(metric: string, value: number, tags?: Record<string, string>): void;
}

class ConsoleLogger implements Logger {
  info(m: string, meta?: Record<string, unknown>) { console.log(JSON.stringify({ level: 'info', message: m, ...meta })); }
  warn(m: string, meta?: Record<string, unknown>) { console.warn(JSON.stringify({ level: 'warn', message: m, ...meta })); }
  error(m: string, meta?: Record<string, unknown>) { console.error(JSON.stringify({ level: 'error', message: m, ...meta })); }
  debug(m: string, meta?: Record<string, unknown>) { console.debug(JSON.stringify({ level: 'debug', message: m, ...meta })); }
}

/**
 * AI-Powered Enrichment Pipeline Manager
 */
export class EnrichmentPipelineManager extends EventEmitter {
  private pipelines: Map<string, EnrichmentPipelineConfig> = new Map();
  private stageProcessors: Map<EnrichmentStageType, StageProcessor> = new Map();
  private customProcessors: Map<string, StageProcessor> = new Map();
  private options: Required<EnrichmentPipelineOptions>;

  constructor(options: EnrichmentPipelineOptions = {}) {
    super();
    this.options = {
      logger: options.logger || new ConsoleLogger(),
      metrics: options.metrics || { increment: () => {}, histogram: () => {} },
      defaultModelProvider: options.defaultModelProvider || 'openai',
      defaultModelId: options.defaultModelId || 'gpt-4o-mini',
      modelEndpoints: options.modelEndpoints || {},
      ...options,
    };

    this.registerDefaultProcessors();
  }

  /**
   * Register default stage processors
   */
  private registerDefaultProcessors(): void {
    // Entity extraction
    this.stageProcessors.set('entity_extraction', async (payload, config, context) => {
      const startTime = performance.now();
      const inputText = this.extractInputText(payload, config.inputFields);

      try {
        const entities = await this.callEntityExtraction(inputText, config);
        return {
          stageId: config.id,
          stageName: config.name,
          stageType: 'entity_extraction',
          success: true,
          data: { entities },
          confidence: entities.length > 0 ? entities.reduce((sum, e) => sum + e.confidence, 0) / entities.length : 1,
          processingTimeMs: performance.now() - startTime,
        };
      } catch (error) {
        return this.buildErrorResult(config, 'entity_extraction', error as Error, startTime);
      }
    });

    // Sentiment analysis
    this.stageProcessors.set('sentiment_analysis', async (payload, config, context) => {
      const startTime = performance.now();
      const inputText = this.extractInputText(payload, config.inputFields);

      try {
        const sentiment = await this.callSentimentAnalysis(inputText, config);
        return {
          stageId: config.id,
          stageName: config.name,
          stageType: 'sentiment_analysis',
          success: true,
          data: { sentiment },
          confidence: sentiment.confidence,
          processingTimeMs: performance.now() - startTime,
        };
      } catch (error) {
        return this.buildErrorResult(config, 'sentiment_analysis', error as Error, startTime);
      }
    });

    // Anomaly detection
    this.stageProcessors.set('anomaly_detection', async (payload, config, context) => {
      const startTime = performance.now();

      try {
        const anomaly = await this.detectAnomalies(payload, config);
        return {
          stageId: config.id,
          stageName: config.name,
          stageType: 'anomaly_detection',
          success: true,
          data: { anomaly },
          confidence: 1 - anomaly.score, // Inverse score as confidence
          processingTimeMs: performance.now() - startTime,
        };
      } catch (error) {
        return this.buildErrorResult(config, 'anomaly_detection', error as Error, startTime);
      }
    });

    // Semantic tagging
    this.stageProcessors.set('semantic_tagging', async (payload, config, context) => {
      const startTime = performance.now();
      const inputText = this.extractInputText(payload, config.inputFields);

      try {
        const tags = await this.callSemanticTagging(inputText, config);
        return {
          stageId: config.id,
          stageName: config.name,
          stageType: 'semantic_tagging',
          success: true,
          data: { tags },
          confidence: tags.length > 0 ? tags.reduce((sum, t) => sum + t.confidence, 0) / tags.length : 1,
          processingTimeMs: performance.now() - startTime,
        };
      } catch (error) {
        return this.buildErrorResult(config, 'semantic_tagging', error as Error, startTime);
      }
    });

    // Classification
    this.stageProcessors.set('classification', async (payload, config, context) => {
      const startTime = performance.now();
      const inputText = this.extractInputText(payload, config.inputFields);

      try {
        const classification = await this.callClassification(inputText, config);
        return {
          stageId: config.id,
          stageName: config.name,
          stageType: 'classification',
          success: true,
          data: { classification },
          confidence: classification.confidence,
          processingTimeMs: performance.now() - startTime,
        };
      } catch (error) {
        return this.buildErrorResult(config, 'classification', error as Error, startTime);
      }
    });

    // PII detection
    this.stageProcessors.set('pii_detection', async (payload, config, context) => {
      const startTime = performance.now();
      const inputText = this.extractInputText(payload, config.inputFields);

      try {
        const piiResults = await this.detectPII(inputText, config);
        return {
          stageId: config.id,
          stageName: config.name,
          stageType: 'pii_detection',
          success: true,
          data: { pii: piiResults },
          confidence: 0.95, // PII detection is typically high confidence
          processingTimeMs: performance.now() - startTime,
        };
      } catch (error) {
        return this.buildErrorResult(config, 'pii_detection', error as Error, startTime);
      }
    });

    // Summarization
    this.stageProcessors.set('summarization', async (payload, config, context) => {
      const startTime = performance.now();
      const inputText = this.extractInputText(payload, config.inputFields);

      try {
        const summary = await this.callSummarization(inputText, config);
        return {
          stageId: config.id,
          stageName: config.name,
          stageType: 'summarization',
          success: true,
          data: { summary },
          confidence: 0.9,
          processingTimeMs: performance.now() - startTime,
        };
      } catch (error) {
        return this.buildErrorResult(config, 'summarization', error as Error, startTime);
      }
    });

    // Relationship extraction
    this.stageProcessors.set('relationship_extraction', async (payload, config, context) => {
      const startTime = performance.now();
      const inputText = this.extractInputText(payload, config.inputFields);

      try {
        const relationships = await this.extractRelationships(inputText, config);
        return {
          stageId: config.id,
          stageName: config.name,
          stageType: 'relationship_extraction',
          success: true,
          data: { relationships },
          confidence: relationships.length > 0 ? 0.85 : 1,
          processingTimeMs: performance.now() - startTime,
        };
      } catch (error) {
        return this.buildErrorResult(config, 'relationship_extraction', error as Error, startTime);
      }
    });
  }

  /**
   * Register a pipeline
   */
  registerPipeline(config: EnrichmentPipelineConfig): void {
    const validated = EnrichmentPipelineConfigSchema.parse(config);
    this.pipelines.set(validated.id, validated);
    this.options.logger.info('Enrichment pipeline registered', { pipelineId: validated.id, name: validated.name });
    this.emit('pipeline:registered', validated);
  }

  /**
   * Register a custom stage processor
   */
  registerCustomProcessor(name: string, processor: StageProcessor): void {
    this.customProcessors.set(name, processor);
    this.options.logger.debug('Custom processor registered', { name });
  }

  /**
   * Process data through a pipeline
   */
  async process(
    pipelineId: string,
    payload: Record<string, unknown>,
    context: SwitchboardContext
  ): Promise<PipelineResult> {
    const startTime = performance.now();
    const pipeline = this.pipelines.get(pipelineId);

    if (!pipeline) {
      throw new Error(`Pipeline not found: ${pipelineId}`);
    }

    if (!pipeline.enabled) {
      return {
        pipelineId,
        pipelineName: pipeline.name,
        success: true,
        stageResults: [],
        enrichedPayload: payload,
        totalProcessingTimeMs: 0,
        timestamp: Date.now(),
      };
    }

    this.options.metrics.increment('enrichment.pipeline.started', { pipelineId });
    const stageResults: EnrichmentResult[] = [];
    let enrichedPayload = { ...payload };

    // Sort stages by order
    const sortedStages = [...pipeline.stages]
      .filter((s) => s.enabled)
      .sort((a, b) => a.order - b.order);

    try {
      if (pipeline.parallelExecution) {
        // Execute stages in parallel
        const results = await Promise.all(
          sortedStages.map((stage) => this.executeStage(stage, enrichedPayload, context))
        );

        for (let i = 0; i < results.length; i++) {
          const result = results[i];
          stageResults.push(result);

          if (result.success && sortedStages[i].appendToPayload) {
            const outputField = sortedStages[i].outputField || `enrichment_${sortedStages[i].type}`;
            enrichedPayload[outputField] = result.data;
          }

          if (!result.success && pipeline.stopOnError) {
            break;
          }
        }
      } else {
        // Execute stages sequentially
        for (const stage of sortedStages) {
          // Check filter condition
          if (stage.filterCondition && !this.evaluateFilter(enrichedPayload, stage.filterCondition)) {
            continue;
          }

          const result = await this.executeStage(stage, enrichedPayload, context);
          stageResults.push(result);

          if (result.success && stage.appendToPayload) {
            const outputField = stage.outputField || `enrichment_${stage.type}`;
            enrichedPayload[outputField] = result.data;
          }

          if (!result.success && pipeline.stopOnError) {
            this.options.logger.warn('Pipeline stopped due to stage error', {
              pipelineId,
              stageId: stage.id,
              error: result.error,
            });
            break;
          }
        }
      }

      const totalProcessingTimeMs = performance.now() - startTime;
      const success = stageResults.every((r) => r.success) || !pipeline.stopOnError;

      this.options.metrics.histogram('enrichment.pipeline.duration', totalProcessingTimeMs, { pipelineId });
      this.options.metrics.increment('enrichment.pipeline.completed', { pipelineId, success: String(success) });

      const result: PipelineResult = {
        pipelineId,
        pipelineName: pipeline.name,
        success,
        stageResults,
        enrichedPayload,
        totalProcessingTimeMs,
        timestamp: Date.now(),
      };

      this.emit('pipeline:completed', result);
      return result;
    } catch (error) {
      this.options.metrics.increment('enrichment.pipeline.failed', { pipelineId });
      this.options.logger.error('Pipeline execution failed', { pipelineId, error: (error as Error).message });
      throw error;
    }
  }

  /**
   * Execute a single enrichment stage
   */
  private async executeStage(
    stage: EnrichmentStageConfig,
    payload: Record<string, unknown>,
    context: SwitchboardContext
  ): Promise<EnrichmentResult> {
    const processor = stage.type === 'custom'
      ? this.customProcessors.get(stage.id)
      : this.stageProcessors.get(stage.type);

    if (!processor) {
      return {
        stageId: stage.id,
        stageName: stage.name,
        stageType: stage.type,
        success: false,
        data: {},
        processingTimeMs: 0,
        error: `No processor found for stage type: ${stage.type}`,
      };
    }

    // Execute with timeout
    const timeoutPromise = new Promise<EnrichmentResult>((_, reject) => {
      setTimeout(() => reject(new Error(`Stage timeout after ${stage.timeout}ms`)), stage.timeout);
    });

    let lastError: Error | undefined;
    for (let attempt = 0; attempt <= stage.maxRetries; attempt++) {
      try {
        const result = await Promise.race([processor(payload, stage, context), timeoutPromise]);
        this.options.metrics.increment('enrichment.stage.completed', { stageType: stage.type, success: 'true' });
        return result;
      } catch (error) {
        lastError = error as Error;
        this.options.logger.warn('Stage execution attempt failed', {
          stageId: stage.id,
          attempt,
          error: lastError.message,
        });

        if (!stage.retryOnFailure || attempt === stage.maxRetries) {
          break;
        }

        // Exponential backoff
        await new Promise((resolve) => setTimeout(resolve, 100 * Math.pow(2, attempt)));
      }
    }

    this.options.metrics.increment('enrichment.stage.completed', { stageType: stage.type, success: 'false' });
    return {
      stageId: stage.id,
      stageName: stage.name,
      stageType: stage.type,
      success: false,
      data: {},
      processingTimeMs: 0,
      error: lastError?.message || 'Unknown error',
    };
  }

  /**
   * Extract input text from payload
   */
  private extractInputText(payload: Record<string, unknown>, inputFields?: string[]): string {
    if (!inputFields || inputFields.length === 0) {
      // Try common text fields
      const commonFields = ['text', 'content', 'message', 'body', 'description'];
      for (const field of commonFields) {
        if (typeof payload[field] === 'string') {
          return payload[field] as string;
        }
      }
      return JSON.stringify(payload);
    }

    const texts: string[] = [];
    for (const field of inputFields) {
      const value = this.getNestedValue(payload, field);
      if (value !== undefined) {
        texts.push(String(value));
      }
    }

    return texts.join('\n');
  }

  /**
   * Get nested value from object
   */
  private getNestedValue(obj: Record<string, unknown>, path: string): unknown {
    return path.split('.').reduce((current: unknown, key: string) => {
      if (current && typeof current === 'object') {
        return (current as Record<string, unknown>)[key];
      }
      return undefined;
    }, obj);
  }

  /**
   * Evaluate filter condition
   */
  private evaluateFilter(payload: Record<string, unknown>, filter: string): boolean {
    try {
      // Simple filter evaluation (e.g., "type == 'alert'")
      const parts = filter.split(/\s*(==|!=)\s*/);
      if (parts.length !== 3) return true;

      const [path, operator, expected] = parts;
      const actual = this.getNestedValue(payload, path.trim());
      const expectedValue = expected.trim().replace(/^['"]|['"]$/g, '');

      if (operator === '==') return String(actual) === expectedValue;
      if (operator === '!=') return String(actual) !== expectedValue;
      return true;
    } catch {
      return true;
    }
  }

  /**
   * Build error result
   */
  private buildErrorResult(
    config: EnrichmentStageConfig,
    type: EnrichmentStageType,
    error: Error,
    startTime: number
  ): EnrichmentResult {
    return {
      stageId: config.id,
      stageName: config.name,
      stageType: type,
      success: false,
      data: {},
      processingTimeMs: performance.now() - startTime,
      error: error.message,
    };
  }

  // AI Integration methods (simplified - would use actual AI APIs in production)

  private async callEntityExtraction(text: string, config: EnrichmentStageConfig): Promise<ExtractedEntity[]> {
    // Regex-based entity extraction as fallback
    const entities: ExtractedEntity[] = [];

    // Email detection
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    let match;
    while ((match = emailRegex.exec(text)) !== null) {
      entities.push({
        text: match[0],
        type: 'email',
        confidence: 0.95,
        startIndex: match.index,
        endIndex: match.index + match[0].length,
      });
    }

    // URL detection
    const urlRegex = /https?:\/\/[^\s]+/g;
    while ((match = urlRegex.exec(text)) !== null) {
      entities.push({
        text: match[0],
        type: 'url',
        confidence: 0.95,
        startIndex: match.index,
        endIndex: match.index + match[0].length,
      });
    }

    // Phone detection
    const phoneRegex = /\+?[\d\-\(\)\s]{10,}/g;
    while ((match = phoneRegex.exec(text)) !== null) {
      entities.push({
        text: match[0].trim(),
        type: 'phone',
        confidence: 0.8,
        startIndex: match.index,
        endIndex: match.index + match[0].length,
      });
    }

    return entities;
  }

  private async callSentimentAnalysis(text: string, config: EnrichmentStageConfig): Promise<{
    score: number; // -1 to 1
    label: 'positive' | 'neutral' | 'negative';
    confidence: number;
  }> {
    // Simple keyword-based sentiment analysis as fallback
    const positiveWords = ['good', 'great', 'excellent', 'amazing', 'wonderful', 'fantastic', 'love', 'best'];
    const negativeWords = ['bad', 'terrible', 'awful', 'horrible', 'worst', 'hate', 'poor', 'fail'];

    const lowerText = text.toLowerCase();
    let score = 0;

    for (const word of positiveWords) {
      if (lowerText.includes(word)) score += 0.2;
    }
    for (const word of negativeWords) {
      if (lowerText.includes(word)) score -= 0.2;
    }

    score = Math.max(-1, Math.min(1, score));

    return {
      score,
      label: score > 0.1 ? 'positive' : score < -0.1 ? 'negative' : 'neutral',
      confidence: 0.7,
    };
  }

  private async detectAnomalies(payload: Record<string, unknown>, config: EnrichmentStageConfig): Promise<AnomalyResult> {
    // Simple anomaly detection based on payload size and structure
    const payloadSize = JSON.stringify(payload).length;
    const fieldCount = Object.keys(payload).length;

    // Flag as anomalous if unusually large or has too many fields
    const isAnomaly = payloadSize > 10000 || fieldCount > 50;

    return {
      isAnomaly,
      score: isAnomaly ? 0.8 : 0.1,
      type: isAnomaly ? 'size_anomaly' : undefined,
      explanation: isAnomaly ? `Payload size: ${payloadSize}, Fields: ${fieldCount}` : undefined,
      features: { payloadSize, fieldCount },
    };
  }

  private async callSemanticTagging(text: string, config: EnrichmentStageConfig): Promise<SemanticTag[]> {
    // Simple keyword-based tagging
    const tagMap: Record<string, string[]> = {
      security: ['security', 'breach', 'attack', 'vulnerability', 'threat', 'malware'],
      incident: ['incident', 'outage', 'failure', 'error', 'down', 'critical'],
      performance: ['slow', 'latency', 'performance', 'timeout', 'response'],
      user: ['user', 'customer', 'account', 'login', 'authentication'],
    };

    const tags: SemanticTag[] = [];
    const lowerText = text.toLowerCase();

    for (const [category, keywords] of Object.entries(tagMap)) {
      const matches = keywords.filter((kw) => lowerText.includes(kw));
      if (matches.length > 0) {
        tags.push({
          tag: category,
          confidence: Math.min(0.9, 0.5 + matches.length * 0.1),
          category: 'auto-detected',
        });
      }
    }

    return tags;
  }

  private async callClassification(text: string, config: EnrichmentStageConfig): Promise<{
    label: string;
    confidence: number;
    scores: Record<string, number>;
  }> {
    // Simple rule-based classification
    const categories = {
      alert: ['alert', 'warning', 'critical', 'urgent'],
      info: ['info', 'update', 'notice', 'status'],
      error: ['error', 'exception', 'fail', 'crash'],
      request: ['request', 'query', 'ask', 'need'],
    };

    const scores: Record<string, number> = {};
    const lowerText = text.toLowerCase();

    for (const [category, keywords] of Object.entries(categories)) {
      const matches = keywords.filter((kw) => lowerText.includes(kw)).length;
      scores[category] = matches / keywords.length;
    }

    const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
    const [label, confidence] = sorted[0] || ['unknown', 0];

    return { label, confidence: Math.max(0.5, confidence), scores };
  }

  private async detectPII(text: string, config: EnrichmentStageConfig): Promise<{
    hasPII: boolean;
    types: string[];
    locations: { type: string; startIndex: number; endIndex: number }[];
  }> {
    const locations: { type: string; startIndex: number; endIndex: number }[] = [];
    const types = new Set<string>();

    // SSN pattern
    const ssnRegex = /\b\d{3}-\d{2}-\d{4}\b/g;
    let match;
    while ((match = ssnRegex.exec(text)) !== null) {
      types.add('ssn');
      locations.push({ type: 'ssn', startIndex: match.index, endIndex: match.index + match[0].length });
    }

    // Credit card pattern
    const ccRegex = /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g;
    while ((match = ccRegex.exec(text)) !== null) {
      types.add('credit_card');
      locations.push({ type: 'credit_card', startIndex: match.index, endIndex: match.index + match[0].length });
    }

    // Email already covered in entity extraction
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    while ((match = emailRegex.exec(text)) !== null) {
      types.add('email');
      locations.push({ type: 'email', startIndex: match.index, endIndex: match.index + match[0].length });
    }

    return {
      hasPII: types.size > 0,
      types: Array.from(types),
      locations,
    };
  }

  private async callSummarization(text: string, config: EnrichmentStageConfig): Promise<string> {
    // Simple extractive summarization - take first sentences
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    const maxSentences = 3;
    return sentences.slice(0, maxSentences).join(' ').trim();
  }

  private async extractRelationships(text: string, config: EnrichmentStageConfig): Promise<{
    subject: string;
    predicate: string;
    object: string;
    confidence: number;
  }[]> {
    // Simple pattern-based relationship extraction
    const relationships: { subject: string; predicate: string; object: string; confidence: number }[] = [];

    // Pattern: "X is Y" or "X was Y"
    const isPatterns = /(\w+)\s+(is|was|are|were)\s+(\w+)/gi;
    let match;
    while ((match = isPatterns.exec(text)) !== null) {
      relationships.push({
        subject: match[1],
        predicate: match[2],
        object: match[3],
        confidence: 0.6,
      });
    }

    return relationships;
  }

  /**
   * Get pipeline by ID
   */
  getPipeline(pipelineId: string): EnrichmentPipelineConfig | undefined {
    return this.pipelines.get(pipelineId);
  }

  /**
   * List all pipelines
   */
  listPipelines(): EnrichmentPipelineConfig[] {
    return Array.from(this.pipelines.values());
  }

  /**
   * Remove a pipeline
   */
  removePipeline(pipelineId: string): boolean {
    return this.pipelines.delete(pipelineId);
  }
}

// Export singleton
export const enrichmentPipeline = new EnrichmentPipelineManager();
