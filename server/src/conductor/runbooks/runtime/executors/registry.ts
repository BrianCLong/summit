/**
 * Step Executor Registry
 *
 * Central registry for all step executors.
 *
 * @module runbooks/runtime/executors/registry
 */

import {
  StepExecutorRegistry,
  StepExecutor,
  RunbookActionType,
  IndicatorIngestService,
  InfrastructureEnrichmentService,
  PatternMinerService,
  ReportGeneratorService,
} from '../types';
import { NoOpExecutor } from './base';
import { IngestStepExecutor, DefaultIndicatorIngestService } from './ingest-executor';
import { GraphLookupStepExecutor, DefaultInfrastructureEnrichmentService } from './graph-lookup-executor';
import { PatternMinerStepExecutor, DefaultPatternMinerService } from './pattern-miner-executor';
import { ReportGeneratorStepExecutor, DefaultReportGeneratorService } from './report-executor';
import {
  CustomStepExecutor,
  NotifyStepExecutor,
  ValidateStepExecutor,
  TransformStepExecutor,
  EnrichIntelStepExecutor,
} from './custom-executor';

/**
 * Default implementation of StepExecutorRegistry
 */
export class DefaultStepExecutorRegistry implements StepExecutorRegistry {
  private executors = new Map<RunbookActionType, StepExecutor>();

  register(executor: StepExecutor): void {
    this.executors.set(executor.actionType, executor);
  }

  getExecutor(actionType: RunbookActionType): StepExecutor | undefined {
    return this.executors.get(actionType);
  }

  hasExecutor(actionType: RunbookActionType): boolean {
    return this.executors.has(actionType);
  }

  listExecutors(): RunbookActionType[] {
    return Array.from(this.executors.keys());
  }
}

/**
 * Configuration for creating an executor registry
 */
export interface ExecutorRegistryConfig {
  ingestService?: IndicatorIngestService;
  infraService?: InfrastructureEnrichmentService;
  patternService?: PatternMinerService;
  reportService?: ReportGeneratorService;
  includeDefaults?: boolean;
}

/**
 * Create a fully configured executor registry
 */
export function createExecutorRegistry(config: ExecutorRegistryConfig = {}): DefaultStepExecutorRegistry {
  const registry = new DefaultStepExecutorRegistry();

  if (config.includeDefaults !== false) {
    // Register CTI executors
    registry.register(
      new IngestStepExecutor(config.ingestService || new DefaultIndicatorIngestService())
    );
    registry.register(
      new GraphLookupStepExecutor(config.infraService || new DefaultInfrastructureEnrichmentService())
    );
    registry.register(
      new PatternMinerStepExecutor(config.patternService || new DefaultPatternMinerService())
    );
    registry.register(
      new ReportGeneratorStepExecutor(config.reportService || new DefaultReportGeneratorService())
    );

    // Register utility executors
    registry.register(new CustomStepExecutor());
    registry.register(new NotifyStepExecutor());
    registry.register(new ValidateStepExecutor());
    registry.register(new TransformStepExecutor());
    registry.register(new EnrichIntelStepExecutor());
  }

  return registry;
}

/**
 * Create a minimal executor registry with NoOp executors
 */
export function createNoOpRegistry(): DefaultStepExecutorRegistry {
  const registry = new DefaultStepExecutorRegistry();

  const actionTypes: RunbookActionType[] = [
    'INGEST',
    'LOOKUP_GRAPH',
    'PATTERN_MINER',
    'ENRICH_INTEL',
    'GENERATE_REPORT',
    'NOTIFY',
    'VALIDATE',
    'TRANSFORM',
    'CUSTOM',
  ];

  for (const actionType of actionTypes) {
    registry.register(new NoOpExecutor(actionType));
  }

  return registry;
}

/**
 * Singleton registry instance
 */
let globalRegistry: DefaultStepExecutorRegistry | null = null;

/**
 * Get the global executor registry
 */
export function getGlobalExecutorRegistry(): DefaultStepExecutorRegistry {
  if (!globalRegistry) {
    globalRegistry = createExecutorRegistry();
  }
  return globalRegistry;
}

/**
 * Set the global executor registry
 */
export function setGlobalExecutorRegistry(registry: DefaultStepExecutorRegistry): void {
  globalRegistry = registry;
}

/**
 * Reset the global executor registry
 */
export function resetGlobalExecutorRegistry(): void {
  globalRegistry = null;
}
