import { EventEmitter } from 'events';
import { Pool } from 'pg';
import { logger } from '../utils/logger.js';
import {
  InferenceRecord,
  ModelEngine,
  ModelPerformanceRecord,
  PerformanceSnapshot,
  RealtimeMetricSnapshot,
} from './types.js';

interface AggregatedInferenceState {
  modelVersionId: string;
  modelType: ModelEngine;
  requestCount: number;
  successCount: number;
  failureCount: number;
  totalLatency: number;
  lastUpdated: Date;
  lastPerformance?: PerformanceSnapshot;
}

export class ModelBenchmarkingService {
  private initialized = false;
  private readonly emitter = new EventEmitter();
  private readonly inferenceAggregates = new Map<string, AggregatedInferenceState>();

  constructor(private readonly pool: Pool) {}

  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      await client.query(`
        CREATE TABLE IF NOT EXISTS ml_model_ab_tests (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          experiment_name TEXT UNIQUE NOT NULL,
          description TEXT,
          model_type TEXT NOT NULL,
          variants JSONB NOT NULL,
          status TEXT DEFAULT 'active',
          metadata JSONB DEFAULT '{}',
          created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS ml_model_ab_test_events (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          experiment_id UUID REFERENCES ml_model_ab_tests(id) ON DELETE CASCADE,
          event_type TEXT NOT NULL,
          subject_id TEXT NOT NULL,
          variant TEXT NOT NULL,
          metrics JSONB DEFAULT '{}',
          created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_ml_model_ab_test_events_experiment
          ON ml_model_ab_test_events(experiment_id, created_at DESC)
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS ml_inference_metrics (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          model_version_id UUID REFERENCES ml_model_versions(id) ON DELETE SET NULL,
          model_type TEXT NOT NULL,
          input_type TEXT NOT NULL,
          latency_ms NUMERIC(14,4) NOT NULL,
          success BOOLEAN DEFAULT true,
          actual_label TEXT,
          predicted_label TEXT,
          metrics JSONB DEFAULT '{}',
          metadata JSONB DEFAULT '{}',
          created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_ml_inference_metrics_model
          ON ml_inference_metrics(model_version_id, created_at DESC)
      `);

      await client.query('COMMIT');
      this.initialized = true;
      logger.info('ModelBenchmarkingService initialized');
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Failed to initialize ModelBenchmarkingService', error);
      throw error;
    } finally {
      client.release();
    }
  }

  onUpdate(listener: (snapshots: RealtimeMetricSnapshot[]) => void): void {
    this.emitter.on('update', listener);
  }

  removeUpdateListener(listener: (snapshots: RealtimeMetricSnapshot[]) => void): void {
    this.emitter.removeListener('update', listener);
  }

  async recordPerformance(record: ModelPerformanceRecord): Promise<void> {
    await this.initialize();

    const evaluationDate = record.evaluationDate
      ? new Date(record.evaluationDate)
      : new Date();

    await this.pool.query(
      `
        INSERT INTO ml_model_performance (
          model_version_id,
          metric_name,
          metric_value,
          evaluation_date,
          test_set_size,
          evaluation_context
        ) VALUES
          ($1, 'accuracy', $2, $6, $7, $8),
          ($1, 'precision', $3, $6, $7, $8),
          ($1, 'recall', $4, $6, $7, $8),
          ($1, 'f1_score', $5, $6, $7, $8)
      `,
      [
        record.modelVersionId,
        record.accuracy,
        record.precision,
        record.recall,
        record.f1Score,
        evaluationDate,
        record.testSetSize ?? null,
        JSON.stringify({
          modelType: record.modelType,
          ...(record.evaluationContext ?? {}),
        }),
      ],
    );

    const key = record.modelVersionId;
    const aggregate = this.inferenceAggregates.get(key) ?? {
      modelVersionId: record.modelVersionId,
      modelType: record.modelType,
      requestCount: 0,
      successCount: 0,
      failureCount: 0,
      totalLatency: 0,
      lastUpdated: new Date(),
    };

    aggregate.lastPerformance = {
      accuracy: record.accuracy,
      precision: record.precision,
      recall: record.recall,
      f1Score: record.f1Score,
      evaluationDate,
      dataset: record.dataset,
      testSetSize: record.testSetSize,
      context: record.evaluationContext,
    };
    aggregate.lastUpdated = new Date();

    this.inferenceAggregates.set(key, aggregate);
    this.emitUpdate();
  }

  async recordInference(record: InferenceRecord): Promise<void> {
    await this.initialize();

    await this.pool.query(
      `
        INSERT INTO ml_inference_metrics (
          model_version_id,
          model_type,
          input_type,
          latency_ms,
          success,
          actual_label,
          predicted_label,
          metrics,
          metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `,
      [
        record.modelVersionId,
        record.modelType,
        record.inputType,
        record.latencyMs,
        record.success,
        record.actualLabel ?? null,
        record.predictedLabel ?? null,
        JSON.stringify(record.metrics ?? {}),
        JSON.stringify(record.metadata ?? {}),
      ],
    );

    const key = record.modelVersionId;
    const aggregate = this.inferenceAggregates.get(key) ?? {
      modelVersionId: record.modelVersionId,
      modelType: record.modelType,
      requestCount: 0,
      successCount: 0,
      failureCount: 0,
      totalLatency: 0,
      lastUpdated: new Date(),
    };

    aggregate.requestCount += 1;
    aggregate.totalLatency += record.latencyMs;
    aggregate.lastUpdated = new Date();
    if (record.success) {
      aggregate.successCount += 1;
    } else {
      aggregate.failureCount += 1;
    }

    if (record.metrics) {
      aggregate.lastPerformance = {
        accuracy: record.metrics.accuracy ?? aggregate.lastPerformance?.accuracy ?? 0,
        precision: record.metrics.precision ?? aggregate.lastPerformance?.precision ?? 0,
        recall: record.metrics.recall ?? aggregate.lastPerformance?.recall ?? 0,
        f1Score: record.metrics.f1Score ?? aggregate.lastPerformance?.f1Score ?? 0,
        evaluationDate: record.metrics.evaluationDate ?? new Date(),
        dataset: record.metrics.dataset,
        testSetSize: record.metrics.testSetSize,
        context: record.metrics.context,
      };
    }

    this.inferenceAggregates.set(key, aggregate);
    this.emitUpdate();
  }

  async getPerformanceHistory(
    modelVersionId: string,
    limit = 50,
  ): Promise<PerformanceSnapshot[]> {
    await this.initialize();

    const result = await this.pool.query(
      `
        SELECT metric_name, metric_value, evaluation_date, evaluation_context
        FROM ml_model_performance
        WHERE model_version_id = $1
        ORDER BY evaluation_date DESC, metric_name ASC
        LIMIT $2 * 4
      `,
      [modelVersionId, limit],
    );

    const grouped = new Map<string, PerformanceSnapshot>();

    for (const row of result.rows) {
      const key = new Date(row.evaluation_date).toISOString();
      const snapshot = grouped.get(key) ?? {
        accuracy: 0,
        precision: 0,
        recall: 0,
        f1Score: 0,
        evaluationDate: row.evaluation_date,
        context: row.evaluation_context ?? {},
      };

      switch (row.metric_name) {
        case 'accuracy':
          snapshot.accuracy = Number(row.metric_value);
          break;
        case 'precision':
          snapshot.precision = Number(row.metric_value);
          break;
        case 'recall':
          snapshot.recall = Number(row.metric_value);
          break;
        case 'f1_score':
          snapshot.f1Score = Number(row.metric_value);
          break;
        default:
          break;
      }

      grouped.set(key, snapshot);
    }

    return Array.from(grouped.values()).sort(
      (a, b) =>
        new Date(a.evaluationDate ?? 0).getTime() -
        new Date(b.evaluationDate ?? 0).getTime(),
    );
  }

  getRealtimeSnapshot(modelType?: ModelEngine): RealtimeMetricSnapshot[] {
    const snapshots: RealtimeMetricSnapshot[] = [];

    for (const aggregate of this.inferenceAggregates.values()) {
      if (modelType && aggregate.modelType !== modelType) {
        continue;
      }

      const averageLatency =
        aggregate.requestCount === 0
          ? 0
          : aggregate.totalLatency / aggregate.requestCount;
      const successRate =
        aggregate.requestCount === 0
          ? 0
          : aggregate.successCount / aggregate.requestCount;

      snapshots.push({
        modelVersionId: aggregate.modelVersionId,
        modelType: aggregate.modelType,
        averageLatencyMs: Number(averageLatency.toFixed(2)),
        requestCount: aggregate.requestCount,
        successCount: aggregate.successCount,
        failureCount: aggregate.failureCount,
        successRate: Number((successRate * 100).toFixed(2)),
        lastUpdated: aggregate.lastUpdated.toISOString(),
        lastPerformance: aggregate.lastPerformance,
      });
    }

    return snapshots.sort(
      (a, b) =>
        new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime(),
    );
  }

  private emitUpdate(): void {
    const snapshots = this.getRealtimeSnapshot();
    this.emitter.emit('update', snapshots);
  }
}
