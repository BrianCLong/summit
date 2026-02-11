import { jest } from '@jest/globals';
import { DataPipeline } from '../../src/data-pipeline/pipeline';
import { DataQualityChecker } from '../../src/data-pipeline/quality';
import { SchemaRegistry } from '../../src/data-pipeline/schemaRegistry';
import { TransformationPipeline } from '../../src/data-pipeline/transforms';
import type { DataRecord, IngestionResult, IngestionSource } from '../../src/data-pipeline/types';
import { createFaultInjector, FaultInjector } from '../../test/utils/faultInjector';

class FaultySource implements IngestionSource {
  name: string;

  private readonly injector: FaultInjector;

  private readonly payload: DataRecord[];

  constructor(name: string, injector: FaultInjector, payload: DataRecord[]) {
    this.name = name;
    this.injector = injector;
    this.payload = payload;
  }

  async load(): Promise<IngestionResult> {
    const fault = this.injector.nextFault();
    if (fault) {
      const error = new Error(fault.message) as Error & { code?: string; transient?: boolean };
      error.code = fault.code;
      error.transient = fault.kind === 'transient';
      throw error;
    }

    return {
      source: this.name,
      records: this.payload,
    };
  }
}

const buildPipeline = (source: IngestionSource) => {
  const registry = new SchemaRegistry();
  registry.register({
    version: '1.0.0',
    schema: {
      type: 'object',
      properties: { id: { type: 'string' }, value: { type: 'number' } },
      required: ['id', 'value'],
    },
  });

  return new DataPipeline(
    [source],
    registry,
    new TransformationPipeline(),
    new DataQualityChecker(),
    {
      schemaVersion: '1.0.0',
      qualityRules: {},
      deduplicationKey: 'id',
      watermarkField: 'value',
    }
  );
};

describe('chaos harness for ingestion pathways', () => {
  afterEach(() => {
    delete process.env.CHAOS_PROVENANCE_LOGS;
    jest.restoreAllMocks();
  });

  it('retries through transient faults and still maps metrics cleanly', async () => {
    const injector = createFaultInjector('transient-seed', 'transient-timeout');
    const pipeline = buildPipeline(
      new FaultySource('chaos-source', injector, [{ id: 'a', value: 1 }]),
    );

    const outcome = await pipeline.run();

    expect(outcome.processed).toHaveLength(1);
    expect(outcome.deadLetters).toHaveLength(0);
    const metrics = outcome.metrics.find((metric) => metric.source === 'chaos-source');
    expect(metrics?.ingestionErrors ?? 0).toBeLessThanOrEqual(1);
  });

  it('captures permanent failures with stable codes and provenance breadcrumbs', async () => {
    process.env.CHAOS_PROVENANCE_LOGS = 'true';
    const consoleSpy = jest.spyOn(console, 'info').mockImplementation();
    const injector = createFaultInjector('permanent-seed', 'permanent-failure');
    const pipeline = buildPipeline(
      new FaultySource('chaos-source', injector, [{ id: 'b', value: 2 }]),
    );

    const outcome = await pipeline.run();

    expect(outcome.processed).toHaveLength(0);
    expect(outcome.deadLetters).toHaveLength(1);
    expect(outcome.deadLetters[0].errorCode).toBe('INGESTION_PERMANENT_FAILURE');
    expect(outcome.deadLetters[0].provenance?.featureFlag).toBe('CHAOS_PROVENANCE_LOGS');
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('[chaos][ingestion]'),
      expect.objectContaining({ errorCode: 'INGESTION_PERMANENT_FAILURE' })
    );
  });
});
