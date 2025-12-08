/**
 * Base Step Executor
 *
 * Abstract base class for step executors with common functionality.
 *
 * @module runbooks/runtime/executors/base
 */

import { v4 as uuidv4 } from 'uuid';
import { createHash } from 'crypto';
import {
  StepExecutor,
  StepExecutorContext,
  StepExecutorResult,
  RunbookActionType,
} from '../types';
import { Evidence, Citation, CryptographicProof } from '../../dags/types';

/**
 * Abstract base class for step executors
 */
export abstract class BaseStepExecutor implements StepExecutor {
  abstract readonly actionType: RunbookActionType;

  /**
   * Execute the step (to be implemented by subclasses)
   */
  abstract execute(ctx: StepExecutorContext): Promise<StepExecutorResult>;

  /**
   * Create a successful result
   */
  protected success(
    output: Record<string, unknown>,
    options?: {
      evidence?: Evidence[];
      citations?: Citation[];
      proofs?: CryptographicProof[];
      kpis?: Record<string, number>;
      metadata?: Record<string, unknown>;
    }
  ): StepExecutorResult {
    return {
      success: true,
      output,
      evidence: options?.evidence || [],
      citations: options?.citations || [],
      proofs: options?.proofs || [],
      kpis: options?.kpis || {},
      metadata: options?.metadata,
    };
  }

  /**
   * Create a failure result
   */
  protected failure(errorMessage: string): StepExecutorResult {
    return {
      success: false,
      output: {},
      errorMessage,
    };
  }

  /**
   * Create evidence
   */
  protected createEvidence(
    type: string,
    data: unknown,
    citations: Citation[] = [],
    metadata?: Record<string, unknown>
  ): Evidence {
    return {
      id: `evidence-${uuidv4()}`,
      type,
      data,
      citations,
      proofs: [],
      collectedAt: new Date(),
      metadata,
    };
  }

  /**
   * Create citation
   */
  protected createCitation(
    source: string,
    url?: string,
    author?: string,
    metadata?: Record<string, unknown>
  ): Citation {
    const citation: Citation = {
      id: `citation-${uuidv4()}`,
      source,
      url,
      author,
      timestamp: new Date(),
      accessedAt: new Date(),
      metadata,
    };

    // Compute hash
    citation.hash = this.computeCitationHash(citation);

    return citation;
  }

  /**
   * Create cryptographic proof
   */
  protected createProof(data: unknown): CryptographicProof {
    const hash = createHash('sha256').update(JSON.stringify(data)).digest('hex');

    return {
      algorithm: 'sha256',
      signature: hash,
      timestamp: new Date(),
    };
  }

  /**
   * Get config value with type safety
   */
  protected getConfig<T>(ctx: StepExecutorContext, key: string, defaultValue: T): T {
    const value = ctx.step.config[key];
    return value !== undefined ? (value as T) : defaultValue;
  }

  /**
   * Get input value
   */
  protected getInput<T>(ctx: StepExecutorContext, key: string, defaultValue: T): T {
    const value = ctx.input[key];
    return value !== undefined ? (value as T) : defaultValue;
  }

  /**
   * Get output from previous step
   */
  protected getPreviousOutput<T>(
    ctx: StepExecutorContext,
    stepId: string,
    key: string,
    defaultValue: T
  ): T {
    const stepOutput = ctx.previousStepOutputs[stepId];
    if (!stepOutput || typeof stepOutput !== 'object') {
      return defaultValue;
    }
    const value = (stepOutput as Record<string, unknown>)[key];
    return value !== undefined ? (value as T) : defaultValue;
  }

  /**
   * Find output from any previous step by key
   */
  protected findPreviousOutput<T>(ctx: StepExecutorContext, key: string): T | undefined {
    for (const stepOutput of Object.values(ctx.previousStepOutputs)) {
      if (stepOutput && typeof stepOutput === 'object') {
        const value = (stepOutput as Record<string, unknown>)[key];
        if (value !== undefined) {
          return value as T;
        }
      }
    }
    return undefined;
  }

  /**
   * Compute hash for citation
   */
  private computeCitationHash(citation: Citation): string {
    const data = JSON.stringify({
      source: citation.source,
      url: citation.url,
      author: citation.author,
      timestamp: citation.timestamp.toISOString(),
    });
    return createHash('sha256').update(data).digest('hex');
  }
}

/**
 * No-op executor for testing
 */
export class NoOpExecutor extends BaseStepExecutor {
  readonly actionType: RunbookActionType;

  constructor(actionType: RunbookActionType) {
    super();
    this.actionType = actionType;
  }

  async execute(ctx: StepExecutorContext): Promise<StepExecutorResult> {
    return this.success(
      { message: `NoOp executor for ${this.actionType}` },
      {
        kpis: { executedAt: Date.now() },
      }
    );
  }
}
