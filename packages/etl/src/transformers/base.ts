import { EventEmitter } from 'events';
import type { TransformationConfig } from '../types.js';

/**
 * Transformation context with metadata
 */
export interface TransformationContext {
  pipelineId: string;
  runId: string;
  tenantId: string;
  metadata: Record<string, unknown>;
}

/**
 * Transformation result
 */
export interface TransformationResult<T = unknown> {
  data: T;
  metadata?: Record<string, unknown>;
  errors?: Array<{
    message: string;
    field?: string;
    severity: 'ERROR' | 'WARNING' | 'INFO';
  }>;
}

/**
 * Base interface for all transformers
 */
export interface ITransformer<TInput = unknown, TOutput = unknown> {
  transform(input: TInput, context: TransformationContext): Promise<TransformationResult<TOutput>>;
  validate(input: TInput): Promise<boolean>;
  getMetadata(): TransformerMetadata;
}

/**
 * Transformer metadata
 */
export interface TransformerMetadata {
  name: string;
  type: string;
  version: string;
  description?: string;
  inputSchema?: unknown;
  outputSchema?: unknown;
}

/**
 * Abstract base class for all transformers
 */
export abstract class BaseTransformer<TInput = unknown, TOutput = unknown>
  extends EventEmitter
  implements ITransformer<TInput, TOutput>
{
  protected config: TransformationConfig;

  constructor(config: TransformationConfig) {
    super();
    this.config = config;
  }

  /**
   * Transform input data
   */
  abstract transform(
    input: TInput,
    context: TransformationContext
  ): Promise<TransformationResult<TOutput>>;

  /**
   * Validate input data
   */
  abstract validate(input: TInput): Promise<boolean>;

  /**
   * Get transformer metadata
   */
  abstract getMetadata(): TransformerMetadata;

  /**
   * Emit transformation event
   */
  protected emitEvent(event: string, data: unknown): void {
    this.emit(event, data);
  }

  /**
   * Create error result
   */
  protected createErrorResult(
    input: TInput,
    error: string,
    field?: string
  ): TransformationResult<TOutput> {
    return {
      data: input as unknown as TOutput,
      errors: [
        {
          message: error,
          field,
          severity: 'ERROR'
        }
      ]
    };
  }

  /**
   * Create success result
   */
  protected createSuccessResult(
    data: TOutput,
    metadata?: Record<string, unknown>
  ): TransformationResult<TOutput> {
    return {
      data,
      metadata
    };
  }
}

/**
 * Transformer factory
 */
export class TransformerFactory {
  private static transformers: Map<
    string,
    new (config: TransformationConfig) => ITransformer
  > = new Map();

  /**
   * Register a transformer type
   */
  static register(
    type: string,
    transformerClass: new (config: TransformationConfig) => ITransformer
  ): void {
    this.transformers.set(type, transformerClass);
  }

  /**
   * Create a transformer instance
   */
  static create(config: TransformationConfig): ITransformer {
    const TransformerClass = this.transformers.get(config.type);
    if (!TransformerClass) {
      throw new Error(`Unknown transformer type: ${config.type}`);
    }
    return new TransformerClass(config);
  }

  /**
   * Get all registered transformer types
   */
  static getTypes(): string[] {
    return Array.from(this.transformers.keys());
  }
}

/**
 * Transformation pipeline
 * Chains multiple transformers together
 */
export class TransformationPipeline<TInput = unknown, TOutput = unknown> {
  private transformers: ITransformer[];
  private context: TransformationContext;

  constructor(transformers: ITransformer[], context: TransformationContext) {
    this.transformers = transformers;
    this.context = context;
  }

  /**
   * Execute the transformation pipeline
   */
  async execute(input: TInput): Promise<TransformationResult<TOutput>> {
    let currentData: unknown = input;
    const allErrors: Array<{
      message: string;
      field?: string;
      severity: 'ERROR' | 'WARNING' | 'INFO';
    }> = [];
    const allMetadata: Record<string, unknown> = {};

    for (const transformer of this.transformers) {
      try {
        const result = await transformer.transform(currentData, this.context);

        if (result.errors && result.errors.length > 0) {
          allErrors.push(...result.errors);

          // Stop if there are critical errors
          const hasCriticalError = result.errors.some((e) => e.severity === 'ERROR');
          if (hasCriticalError) {
            return {
              data: currentData as TOutput,
              errors: allErrors,
              metadata: allMetadata
            };
          }
        }

        currentData = result.data;

        if (result.metadata) {
          Object.assign(allMetadata, result.metadata);
        }
      } catch (error) {
        allErrors.push({
          message: `Transformer ${transformer.getMetadata().name} failed: ${error}`,
          severity: 'ERROR'
        });

        return {
          data: currentData as TOutput,
          errors: allErrors,
          metadata: allMetadata
        };
      }
    }

    return {
      data: currentData as TOutput,
      errors: allErrors.length > 0 ? allErrors : undefined,
      metadata: allMetadata
    };
  }

  /**
   * Get pipeline metadata
   */
  getMetadata(): Array<TransformerMetadata> {
    return this.transformers.map((t) => t.getMetadata());
  }
}
