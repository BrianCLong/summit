/**
 * Custom Step Executor
 *
 * Handles custom step execution through user-provided functions.
 *
 * @module runbooks/runtime/executors/custom-executor
 */

import { BaseStepExecutor } from './base';
import {
  StepExecutorContext,
  StepExecutorResult,
  RunbookActionType,
} from '../types';

/**
 * Custom execution function type
 */
export type CustomExecutionFn = (
  ctx: StepExecutorContext
) => Promise<StepExecutorResult>;

/**
 * Custom step executor for user-defined logic
 */
export class CustomStepExecutor extends BaseStepExecutor {
  readonly actionType: RunbookActionType = 'CUSTOM';

  private customFunctions = new Map<string, CustomExecutionFn>();

  /**
   * Register a custom execution function
   */
  registerFunction(name: string, fn: CustomExecutionFn): void {
    this.customFunctions.set(name, fn);
  }

  /**
   * Unregister a custom execution function
   */
  unregisterFunction(name: string): void {
    this.customFunctions.delete(name);
  }

  async execute(ctx: StepExecutorContext): Promise<StepExecutorResult> {
    try {
      // Get the function name from config
      const functionName = this.getConfig<string>(ctx, 'functionName', '');

      if (!functionName) {
        return this.failure('No functionName specified in step config');
      }

      const customFn = this.customFunctions.get(functionName);

      if (!customFn) {
        return this.failure(`Custom function '${functionName}' not registered`);
      }

      // Execute the custom function
      return await customFn(ctx);
    } catch (error) {
      return this.failure(
        error instanceof Error ? error.message : 'Custom execution failed'
      );
    }
  }
}

/**
 * Notify step executor for sending notifications
 */
export class NotifyStepExecutor extends BaseStepExecutor {
  readonly actionType: RunbookActionType = 'NOTIFY';

  async execute(ctx: StepExecutorContext): Promise<StepExecutorResult> {
    try {
      const channel = this.getConfig<string>(ctx, 'channel', 'default');
      const message = this.getConfig<string>(ctx, 'message', '');
      const recipients = this.getConfig<string[]>(ctx, 'recipients', []);
      const priority = this.getConfig<string>(ctx, 'priority', 'normal');

      // Simulate notification sending
      const notificationId = `notif-${Date.now()}`;

      console.log(
        `[NOTIFY] Channel: ${channel}, Recipients: ${recipients.join(', ')}, Priority: ${priority}`
      );
      console.log(`[NOTIFY] Message: ${message}`);

      return this.success(
        {
          notificationId,
          channel,
          recipients,
          priority,
          sentAt: new Date().toISOString(),
        },
        {
          kpis: {
            notificationsSent: 1,
            recipientCount: recipients.length,
          },
        }
      );
    } catch (error) {
      return this.failure(
        error instanceof Error ? error.message : 'Notification failed'
      );
    }
  }
}

/**
 * Validate step executor for data validation
 */
export class ValidateStepExecutor extends BaseStepExecutor {
  readonly actionType: RunbookActionType = 'VALIDATE';

  async execute(ctx: StepExecutorContext): Promise<StepExecutorResult> {
    try {
      const validationRules = this.getConfig<Record<string, unknown>>(ctx, 'rules', {});
      const dataPath = this.getConfig<string>(ctx, 'dataPath', '');

      // Get data to validate from previous steps
      const data = dataPath
        ? this.findPreviousOutput<unknown>(ctx, dataPath)
        : ctx.input;

      const validationResults: Array<{
        rule: string;
        passed: boolean;
        message?: string;
      }> = [];

      // Simple validation rules
      for (const [rule, value] of Object.entries(validationRules)) {
        const result = this.validateRule(rule, value, data);
        validationResults.push(result);
      }

      const allPassed = validationResults.every((r) => r.passed);

      if (!allPassed) {
        const failures = validationResults.filter((r) => !r.passed);
        return this.failure(
          `Validation failed: ${failures.map((f) => f.message).join('; ')}`
        );
      }

      return this.success(
        {
          validationResults,
          allPassed,
          validatedAt: new Date().toISOString(),
        },
        {
          kpis: {
            rulesChecked: validationResults.length,
            rulesPassed: validationResults.filter((r) => r.passed).length,
          },
        }
      );
    } catch (error) {
      return this.failure(
        error instanceof Error ? error.message : 'Validation failed'
      );
    }
  }

  private validateRule(
    rule: string,
    value: unknown,
    data: unknown
  ): { rule: string; passed: boolean; message?: string } {
    switch (rule) {
      case 'required':
        return {
          rule,
          passed: data !== null && data !== undefined,
          message: data === null || data === undefined ? 'Data is required' : undefined,
        };

      case 'minLength':
        if (Array.isArray(data)) {
          return {
            rule,
            passed: data.length >= (value as number),
            message:
              data.length < (value as number)
                ? `Array length ${data.length} is less than minimum ${value}`
                : undefined,
          };
        }
        return { rule, passed: true };

      case 'hasProperty':
        if (typeof data === 'object' && data !== null) {
          return {
            rule,
            passed: (value as string) in data,
            message:
              !((value as string) in data)
                ? `Property '${value}' not found`
                : undefined,
          };
        }
        return { rule, passed: false, message: 'Data is not an object' };

      default:
        return { rule, passed: true };
    }
  }
}

/**
 * Transform step executor for data transformation
 */
export class TransformStepExecutor extends BaseStepExecutor {
  readonly actionType: RunbookActionType = 'TRANSFORM';

  async execute(ctx: StepExecutorContext): Promise<StepExecutorResult> {
    try {
      const transformType = this.getConfig<string>(ctx, 'transformType', 'passthrough');
      const inputPath = this.getConfig<string>(ctx, 'inputPath', '');
      const outputKey = this.getConfig<string>(ctx, 'outputKey', 'transformedData');

      // Get input data
      const inputData = inputPath
        ? this.findPreviousOutput<unknown>(ctx, inputPath)
        : ctx.input;

      let transformedData: unknown;

      switch (transformType) {
        case 'flatten':
          transformedData = this.flatten(inputData);
          break;

        case 'extract':
          const extractPaths = this.getConfig<string[]>(ctx, 'extractPaths', []);
          transformedData = this.extract(inputData, extractPaths);
          break;

        case 'aggregate':
          const aggregateField = this.getConfig<string>(ctx, 'aggregateField', '');
          transformedData = this.aggregate(inputData, aggregateField);
          break;

        case 'passthrough':
        default:
          transformedData = inputData;
          break;
      }

      return this.success(
        {
          [outputKey]: transformedData,
          transformType,
          transformedAt: new Date().toISOString(),
        },
        {
          kpis: {
            inputSize: JSON.stringify(inputData).length,
            outputSize: JSON.stringify(transformedData).length,
          },
        }
      );
    } catch (error) {
      return this.failure(
        error instanceof Error ? error.message : 'Transform failed'
      );
    }
  }

  private flatten(data: unknown): unknown {
    if (!Array.isArray(data)) return data;

    return data.flat(Infinity);
  }

  private extract(data: unknown, paths: string[]): Record<string, unknown> {
    const result: Record<string, unknown> = {};

    if (typeof data !== 'object' || data === null) {
      return result;
    }

    for (const path of paths) {
      const value = this.getNestedValue(data as Record<string, unknown>, path);
      if (value !== undefined) {
        result[path] = value;
      }
    }

    return result;
  }

  private aggregate(data: unknown, field: string): unknown {
    if (!Array.isArray(data)) return data;

    const counts: Record<string, number> = {};
    for (const item of data) {
      if (typeof item === 'object' && item !== null && field in item) {
        const value = String((item as Record<string, unknown>)[field]);
        counts[value] = (counts[value] || 0) + 1;
      }
    }

    return counts;
  }

  private getNestedValue(obj: Record<string, unknown>, path: string): unknown {
    const parts = path.split('.');
    let current: unknown = obj;

    for (const part of parts) {
      if (current === null || current === undefined) return undefined;
      if (typeof current !== 'object') return undefined;
      current = (current as Record<string, unknown>)[part];
    }

    return current;
  }
}

/**
 * Enrich Intel step executor for intelligence enrichment
 */
export class EnrichIntelStepExecutor extends BaseStepExecutor {
  readonly actionType: RunbookActionType = 'ENRICH_INTEL';

  async execute(ctx: StepExecutorContext): Promise<StepExecutorResult> {
    try {
      // Get data to enrich from previous steps
      const indicators =
        this.findPreviousOutput<Array<{ id: string; value: string; type: string }>>(
          ctx,
          'enrichedIndicators'
        ) || [];

      const enrichmentSources = this.getConfig<string[]>(ctx, 'sources', [
        'whois',
        'geoip',
        'reputation',
      ]);

      // Simulate enrichment
      const enrichedData = indicators.map((ind) => ({
        ...ind,
        enrichment: {
          whois: enrichmentSources.includes('whois')
            ? { registrar: 'Example Registrar', registeredDate: '2023-01-01' }
            : undefined,
          geoip: enrichmentSources.includes('geoip')
            ? { country: 'US', city: 'New York', asn: 'AS12345' }
            : undefined,
          reputation: enrichmentSources.includes('reputation')
            ? { score: Math.floor(Math.random() * 100), category: 'malicious' }
            : undefined,
        },
        enrichedAt: new Date().toISOString(),
      }));

      const citations = enrichmentSources.map((source) =>
        this.createCitation(
          `${source.toUpperCase()} Service`,
          `https://${source}.example.com`,
          'Enrichment Provider',
          { queryTime: new Date().toISOString() }
        )
      );

      const evidence = this.createEvidence(
        'enriched_intelligence',
        { enrichedData },
        citations,
        {
          indicatorCount: indicators.length,
          sourcesUsed: enrichmentSources.length,
          qualityScore: 0.85,
        }
      );

      return this.success(
        {
          enrichedIndicators: enrichedData,
          enrichmentSources,
          enrichedCount: enrichedData.length,
        },
        {
          evidence: [evidence],
          citations,
          kpis: {
            enrichedCount: enrichedData.length,
            sourcesUsed: enrichmentSources.length,
          },
        }
      );
    } catch (error) {
      return this.failure(
        error instanceof Error ? error.message : 'Enrichment failed'
      );
    }
  }
}
