import { EventEmitter } from 'events';
import { SourceScanner, ScanEndpoint, ScanResult } from './scanner/SourceScanner.js';
import { DataProfiler } from './profiler/DataProfiler.js';
import { FusionEngine } from './fusion/FusionEngine.js';
import { ConfidenceScorer } from './confidence/ConfidenceScorer.js';
import { ContextPersistence } from './context/ContextPersistence.js';
import {
  DiscoveredSource,
  DataProfile,
  FusionResult,
  FusionStrategy,
  DeduplicationResult,
  ConfidenceReport,
  UserFeedback,
  LearningContext,
} from './types.js';
import { logger } from './utils/logger.js';

interface EngineConfig {
  scanInterval: number;
  autoIngestThreshold: number;
  enableAutoDiscovery: boolean;
  enableLearning: boolean;
}

interface AutomationRecipe {
  id: string;
  name: string;
  description: string;
  steps: RecipeStep[];
}

interface RecipeStep {
  action: 'scan' | 'profile' | 'fuse' | 'deduplicate' | 'export';
  params: Record<string, unknown>;
}

/**
 * Data Discovery & Fusion Engine
 * Orchestrates automated data discovery, profiling, and fusion
 */
export class DataDiscoveryFusionEngine extends EventEmitter {
  private scanner: SourceScanner;
  private profiler: DataProfiler;
  private fusion: FusionEngine;
  private confidence: ConfidenceScorer;
  private context: ContextPersistence;

  private sources: Map<string, DiscoveredSource> = new Map();
  private profiles: Map<string, DataProfile> = new Map();
  private fusionResults: Map<string, FusionResult> = new Map();
  private recipes: Map<string, AutomationRecipe> = new Map();

  private config: EngineConfig;
  private startTime: Date;

  constructor(config: Partial<EngineConfig> = {}) {
    super();

    this.config = {
      scanInterval: config.scanInterval ?? 60000, // 1 minute
      autoIngestThreshold: config.autoIngestThreshold ?? 0.8,
      enableAutoDiscovery: config.enableAutoDiscovery ?? true,
      enableLearning: config.enableLearning ?? true,
    };

    // Initialize components
    this.scanner = new SourceScanner({
      scanInterval: this.config.scanInterval,
      endpoints: [],
      autoIngestThreshold: this.config.autoIngestThreshold,
    });

    this.profiler = new DataProfiler({
      sampleSize: 10000,
      detectPii: true,
      inferRelationships: true,
    });

    this.fusion = new FusionEngine({
      defaultStrategy: 'fuzzy_match',
      similarityThreshold: 0.8,
      conflictResolution: 'most_complete',
      enableDeduplication: true,
    });

    this.confidence = new ConfidenceScorer();
    this.context = new ContextPersistence();

    this.startTime = new Date();

    // Set up event handlers
    this.setupEventHandlers();

    // Initialize built-in automation recipes
    this.initializeRecipes();

    logger.info('DataDiscoveryFusionEngine initialized', {
      config: this.config,
    });
  }

  /**
   * Start the engine (automated discovery)
   */
  start(): void {
    if (this.config.enableAutoDiscovery) {
      this.scanner.start();
      logger.info('Automated discovery started');
    }
  }

  /**
   * Stop the engine
   */
  stop(): void {
    this.scanner.stop();
    logger.info('Engine stopped');
  }

  /**
   * Trigger a manual scan
   */
  async scan(): Promise<ScanResult> {
    return this.scanner.scan();
  }

  /**
   * Add scan endpoint
   */
  addScanEndpoint(endpoint: ScanEndpoint): void {
    this.scanner.addEndpoint(endpoint);
  }

  /**
   * Get all discovered sources
   */
  getDiscoveredSources(): DiscoveredSource[] {
    return Array.from(this.sources.values());
  }

  /**
   * Profile a data source
   */
  async profileSource(sourceId: string, data: unknown[][]): Promise<DataProfile> {
    const source = this.sources.get(sourceId);
    if (!source) {
      throw new Error(`Source not found: ${sourceId}`);
    }

    source.status = 'profiling';
    const profile = await this.profiler.profile(source, data);
    source.status = 'ready';

    this.profiles.set(sourceId, profile);
    this.emit('source_profiled', { sourceId, profile });

    return profile;
  }

  /**
   * Get profile for a source
   */
  getProfile(sourceId: string): DataProfile | undefined {
    return this.profiles.get(sourceId);
  }

  /**
   * Get profile report as markdown
   */
  getProfileReport(sourceId: string): string | undefined {
    const profile = this.profiles.get(sourceId);
    if (!profile) return undefined;
    return this.profiler.generateReport(profile);
  }

  /**
   * Fuse records from multiple sources
   */
  async fuse(
    records: Array<{ sourceId: string; recordId: string; data: Record<string, unknown> }>,
    matchFields: string[],
    strategy?: FusionStrategy
  ): Promise<FusionResult[]> {
    const results = await this.fusion.fuse(records, matchFields, strategy);

    // Apply learned corrections if learning is enabled
    const processedResults = this.config.enableLearning
      ? results.map(r => this.context.applyLearnedCorrections(r))
      : results;

    // Store results
    for (const result of processedResults) {
      this.fusionResults.set(result.id, result);
    }

    this.emit('fusion_completed', { count: processedResults.length });
    return processedResults;
  }

  /**
   * Deduplicate records
   */
  async deduplicate(
    records: Array<{ sourceId: string; recordId: string; data: Record<string, unknown> }>,
    matchFields: string[]
  ): Promise<DeduplicationResult[]> {
    const results = await this.fusion.deduplicate(records, matchFields);
    this.emit('dedup_completed', { clusters: results.length });
    return results;
  }

  /**
   * Get fusion result by ID
   */
  getFusionResult(id: string): FusionResult | undefined {
    return this.fusionResults.get(id);
  }

  /**
   * Get confidence report for a fusion result
   */
  getConfidenceReport(fusionId: string): ConfidenceReport | undefined {
    const result = this.fusionResults.get(fusionId);
    if (!result) return undefined;

    return this.confidence.generateReport(result, this.profiles, this.sources);
  }

  /**
   * Get confidence visualization data
   */
  getConfidenceVisualization(fusionId: string): object | undefined {
    const report = this.getConfidenceReport(fusionId);
    if (!report) return undefined;
    return this.confidence.generateVisualization(report);
  }

  /**
   * Record user feedback
   */
  recordFeedback(
    userId: string,
    fusionId: string,
    feedbackType: UserFeedback['feedbackType'],
    correction?: Record<string, unknown>,
    comment?: string
  ): UserFeedback {
    const result = this.fusionResults.get(fusionId);
    if (!result) {
      throw new Error(`Fusion result not found: ${fusionId}`);
    }

    const feedback = this.context.recordFeedback(
      userId,
      result,
      feedbackType,
      correction,
      comment
    );

    // Update source reliability based on feedback
    if (feedbackType === 'correct') {
      for (const sourceId of result.lineage.sources) {
        this.confidence.updateSourceReliability(sourceId, 0.02);
      }
    } else if (feedbackType === 'incorrect') {
      for (const sourceId of result.lineage.sources) {
        this.confidence.updateSourceReliability(sourceId, -0.05);
      }
    }

    this.emit('feedback_received', { feedbackId: feedback.id, type: feedbackType });
    return feedback;
  }

  /**
   * Get feedback for a fusion result
   */
  getFeedback(fusionId: string): UserFeedback[] {
    return this.context.getFeedback(fusionId);
  }

  /**
   * Get learning statistics
   */
  getLearningStats(): object {
    return this.context.getStats();
  }

  /**
   * Get learning context for a source
   */
  getLearningContext(sourceId: string): LearningContext | undefined {
    return this.context.getContext(sourceId);
  }

  /**
   * Get available automation recipes
   */
  getAutomationRecipes(): AutomationRecipe[] {
    return Array.from(this.recipes.values());
  }

  /**
   * Execute an automation recipe
   */
  async executeRecipe(
    recipeId: string,
    params: Record<string, unknown>
  ): Promise<unknown> {
    const recipe = this.recipes.get(recipeId);
    if (!recipe) {
      throw new Error(`Recipe not found: ${recipeId}`);
    }

    logger.info('Executing recipe', { recipeId, name: recipe.name });

    const results: unknown[] = [];
    for (const step of recipe.steps) {
      const stepResult = await this.executeRecipeStep(step, params);
      results.push(stepResult);
    }

    return { recipeId, results };
  }

  /**
   * Execute a single recipe step
   */
  private async executeRecipeStep(
    step: RecipeStep,
    params: Record<string, unknown>
  ): Promise<unknown> {
    switch (step.action) {
      case 'scan':
        return this.scan();
      case 'profile':
        const sourceId = (params.sourceId || step.params.sourceId) as string;
        const data = (params.data || step.params.data) as unknown[][];
        return this.profileSource(sourceId, data);
      case 'fuse':
        const records = (params.records || step.params.records) as Array<{
          sourceId: string;
          recordId: string;
          data: Record<string, unknown>;
        }>;
        const matchFields = (params.matchFields || step.params.matchFields) as string[];
        return this.fuse(records, matchFields);
      case 'deduplicate':
        const dedupRecords = (params.records || step.params.records) as Array<{
          sourceId: string;
          recordId: string;
          data: Record<string, unknown>;
        }>;
        const dedupFields = (params.matchFields || step.params.matchFields) as string[];
        return this.deduplicate(dedupRecords, dedupFields);
      default:
        throw new Error(`Unknown action: ${step.action}`);
    }
  }

  /**
   * Get engine statistics
   */
  getStats(): object {
    return {
      uptime: Date.now() - this.startTime.getTime(),
      sources: this.sources.size,
      profiles: this.profiles.size,
      fusionResults: this.fusionResults.size,
      recipes: this.recipes.size,
      learning: this.context.getStats(),
    };
  }

  /**
   * Set up internal event handlers
   */
  private setupEventHandlers(): void {
    // Handle discovered sources
    this.scanner.on('event', (event) => {
      if (event.type === 'source_discovered') {
        const source = event.payload as DiscoveredSource;
        this.sources.set(source.id, source);
        this.emit('source_discovered', source);
      }
    });

    // Handle auto-ingest triggers
    this.scanner.on('auto_ingest', (source: DiscoveredSource) => {
      logger.info('Auto-ingest triggered', { sourceId: source.id, name: source.name });
      this.emit('auto_ingest', source);
    });
  }

  /**
   * Initialize built-in automation recipes
   */
  private initializeRecipes(): void {
    this.recipes.set('full-discovery', {
      id: 'full-discovery',
      name: 'Full Discovery Pipeline',
      description: 'Scan, profile, and prepare all sources',
      steps: [
        { action: 'scan', params: {} },
      ],
    });

    this.recipes.set('entity-fusion', {
      id: 'entity-fusion',
      name: 'Entity Fusion',
      description: 'Fuse entities from multiple sources',
      steps: [
        { action: 'fuse', params: { matchFields: ['name', 'email'] } },
      ],
    });

    this.recipes.set('dedup-cleanup', {
      id: 'dedup-cleanup',
      name: 'Deduplication Cleanup',
      description: 'Remove duplicate records',
      steps: [
        { action: 'deduplicate', params: { matchFields: ['name', 'email'] } },
      ],
    });
  }
}
