import crypto from 'crypto';
import { Pool } from 'pg';
import { logger } from '../utils/logger.js';
import {
  ABTestAssignment,
  ABTestConfig,
  ABTestOutcome,
  ABTestVariant,
} from './types.js';
import { ModelBenchmarkingService } from './ModelBenchmarkingService.js';

interface CachedExperiment {
  id: string;
  config: ABTestConfig;
}

export class ABTestingManager {
  private readonly experiments = new Map<string, CachedExperiment>();

  constructor(
    private readonly pool: Pool,
    private readonly benchmarkingService: ModelBenchmarkingService,
  ) {}

  async initialize(): Promise<void> {
    await this.benchmarkingService.initialize();
  }

  async createOrUpdateExperiment(config: ABTestConfig): Promise<CachedExperiment> {
    await this.initialize();

    const normalized = this.normalizeVariants(config.variants);
    const result = await this.pool.query(
      `
        INSERT INTO ml_model_ab_tests (
          experiment_name,
          description,
          model_type,
          variants,
          status,
          metadata
        ) VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (experiment_name)
        DO UPDATE SET
          description = EXCLUDED.description,
          model_type = EXCLUDED.model_type,
          variants = EXCLUDED.variants,
          status = EXCLUDED.status,
          metadata = EXCLUDED.metadata,
          updated_at = CURRENT_TIMESTAMP
        RETURNING id
      `,
      [
        config.name,
        config.description ?? null,
        config.modelType,
        JSON.stringify(normalized),
        config.status ?? 'active',
        JSON.stringify(config.metadata ?? {}),
      ],
    );

    const cached: CachedExperiment = {
      id: result.rows[0].id,
      config: { ...config, variants: normalized },
    };

    this.experiments.set(config.name, cached);
    logger.info(`AB test ${config.name} saved`, { experimentId: cached.id });
    return cached;
  }

  async assignVariant(
    experimentName: string,
    subjectId: string,
  ): Promise<ABTestAssignment> {
    const experiment = await this.getExperiment(experimentName);

    if (experiment.config.status === 'paused') {
      throw new Error(`Experiment ${experimentName} is paused`);
    }

    const variant = this.pickVariant(experiment.config.variants, experimentName, subjectId);

    await this.pool.query(
      `
        INSERT INTO ml_model_ab_test_events (
          experiment_id,
          event_type,
          subject_id,
          variant,
          metrics
        ) VALUES ($1, 'exposure', $2, $3, '{}'::jsonb)
      `,
      [experiment.id, subjectId, variant.id],
    );

    return {
      experimentId: experiment.id,
      variantId: variant.id,
      modelVersionId: variant.modelVersionId,
    };
  }

  async recordOutcome(outcome: ABTestOutcome): Promise<void> {
    const experiment = await this.getExperimentById(outcome.experimentId);

    await this.pool.query(
      `
        INSERT INTO ml_model_ab_test_events (
          experiment_id,
          event_type,
          subject_id,
          variant,
          metrics
        ) VALUES ($1, 'outcome', $2, $3, $4)
      `,
      [
        outcome.experimentId,
        outcome.subjectId,
        outcome.variantId,
        JSON.stringify(outcome.metrics ?? {}),
      ],
    );

    logger.debug('Recorded AB test outcome', {
      experimentId: outcome.experimentId,
      variantId: outcome.variantId,
    });
  }

  async getExperimentReport(experimentName: string): Promise<any> {
    const experiment = await this.getExperiment(experimentName);

    const exposureResult = await this.pool.query(
      `
        SELECT variant, COUNT(*)::int AS exposures
        FROM ml_model_ab_test_events
        WHERE experiment_id = $1 AND event_type = 'exposure'
        GROUP BY variant
      `,
      [experiment.id],
    );

    const outcomeResult = await this.pool.query(
      `
        SELECT variant, metrics
        FROM ml_model_ab_test_events
        WHERE experiment_id = $1 AND event_type = 'outcome'
      `,
      [experiment.id],
    );

    const exposureMap = new Map<string, number>();
    for (const row of exposureResult.rows) {
      exposureMap.set(row.variant, Number(row.exposures));
    }

    const variantMetrics = new Map<string, {
      count: number;
      accuracy: number;
      precision: number;
      recall: number;
      f1Score: number;
      latency: number;
    }>();

    for (const row of outcomeResult.rows) {
      const metrics = row.metrics || {};
      const agg = variantMetrics.get(row.variant) ?? {
        count: 0,
        accuracy: 0,
        precision: 0,
        recall: 0,
        f1Score: 0,
        latency: 0,
      };

      agg.count += 1;
      agg.accuracy += metrics.accuracy ?? 0;
      agg.precision += metrics.precision ?? 0;
      agg.recall += metrics.recall ?? 0;
      agg.f1Score += metrics.f1Score ?? 0;
      agg.latency += metrics.inferenceLatencyMs ?? 0;
      variantMetrics.set(row.variant, agg);
    }

    const variants = experiment.config.variants.map((variant) => {
      const exposureCount = exposureMap.get(variant.id) ?? 0;
      const metrics = variantMetrics.get(variant.id);
      const averageMetrics = metrics
        ? {
            accuracy: metrics.accuracy / metrics.count || 0,
            precision: metrics.precision / metrics.count || 0,
            recall: metrics.recall / metrics.count || 0,
            f1Score: metrics.f1Score / metrics.count || 0,
            latencyMs: metrics.latency / metrics.count || 0,
            sampleSize: metrics.count,
          }
        : null;

      return {
        ...variant,
        exposures: exposureCount,
        performance: averageMetrics,
      };
    });

    return {
      experiment: {
        id: experiment.id,
        name: experiment.config.name,
        description: experiment.config.description,
        modelType: experiment.config.modelType,
        status: experiment.config.status ?? 'active',
      },
      variants,
    };
  }

  private normalizeVariants(variants: ABTestVariant[]): ABTestVariant[] {
    const totalWeight = variants.reduce((sum, variant) => sum + variant.weight, 0);
    if (totalWeight === 0) {
      throw new Error('Variant weights must be greater than zero');
    }

    return variants.map((variant) => ({
      ...variant,
      weight: (variant.weight / totalWeight) * 100,
    }));
  }

  private async getExperiment(name: string): Promise<CachedExperiment> {
    const cached = this.experiments.get(name);
    if (cached) {
      return cached;
    }

    const result = await this.pool.query(
      `
        SELECT id, experiment_name, description, model_type, variants, status, metadata
        FROM ml_model_ab_tests
        WHERE experiment_name = $1
      `,
      [name],
    );

    if (result.rowCount === 0) {
      throw new Error(`Experiment ${name} not found`);
    }

    const row = result.rows[0];
    const experiment: CachedExperiment = {
      id: row.id,
      config: {
        name: row.experiment_name,
        description: row.description ?? undefined,
        modelType: row.model_type,
        variants: row.variants,
        status: row.status,
        metadata: row.metadata ?? undefined,
      },
    };

    this.experiments.set(name, experiment);
    return experiment;
  }

  private async getExperimentById(id: string): Promise<CachedExperiment> {
    for (const experiment of this.experiments.values()) {
      if (experiment.id === id) {
        return experiment;
      }
    }

    const result = await this.pool.query(
      `
        SELECT experiment_name
        FROM ml_model_ab_tests
        WHERE id = $1
      `,
      [id],
    );

    if (result.rowCount === 0) {
      throw new Error(`Experiment with id ${id} not found`);
    }

    return this.getExperiment(result.rows[0].experiment_name);
  }

  private pickVariant(
    variants: ABTestVariant[],
    experimentName: string,
    subjectId: string,
  ): ABTestVariant {
    const hash = crypto
      .createHash('sha256')
      .update(`${experimentName}:${subjectId}`)
      .digest('hex');
    const bucket = parseInt(hash.slice(0, 8), 16) % 10000;

    let cumulative = 0;
    for (const variant of variants) {
      cumulative += Math.round(variant.weight * 100);
      if (bucket < cumulative) {
        return variant;
      }
    }

    return variants[variants.length - 1];
  }
}
