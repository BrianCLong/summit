import axios from 'axios';
import {
  AirflowScheduleBuilder,
  ApiSource,
  CsvSource,
  DataPipeline,
  DataQualityChecker,
  IngestionAdapters,
  JsonSource,
  SchemaRegistry,
  SchemaValidator,
  TemporalScheduleBuilder,
  TransformationPipeline,
  coerceTypes,
  normalizeKeys,
} from '../src/data-pipeline/index.js';

describe('DataPipeline', () => {
  const schema = {
    type: 'object',
    properties: {
      id: { type: 'string' },
      value: { type: 'number' },
      updated_at: { type: 'number' },
    },
    required: ['id', 'value', 'updated_at'],
  };

  const setupPipeline = () => {
    const registry = new SchemaRegistry();
    registry.register({ version: '1.0.0', schema });
    const validator = new SchemaValidator(schema);
    const quality = new DataQualityChecker();
    const transforms = new TransformationPipeline();
    transforms.register(normalizeKeys);
    transforms.register((record) => coerceTypes(record, { value: 'number' }));

    const csv = new CsvSource(
      'csv',
      'id,value,updated_at\n1,10,1\n1,10,1\n2,5,2\n'
    );
    const json = new JsonSource('json', [
      { id: '3', value: '-1', updated_at: 4 },
      { id: '4', value: 30, updated_at: 3 },
    ]);
    const db = new IngestionAdapters.DatabaseSource('db', async () => ({
      rows: [{ id: '5', value: 100, updated_at: 5 }],
    }));

    const pipeline = new DataPipeline(
      [csv, json, db],
      registry,
      transforms,
      quality,
      {
        schemaVersion: '1.0.0',
        deduplicationKey: 'id',
        watermarkField: 'updated_at',
        qualityRules: {
          ranges: [{ field: 'value', min: 0 }],
          unique: [{ field: 'id' }],
        },
      },
      validator
    );

    return pipeline;
  };

  it('ingests, validates, transforms, deduplicates, and enforces watermarks', async () => {
    const pipeline = setupPipeline();
    const { processed, metrics, deadLetters } = await pipeline.run();

    expect(processed).toEqual([
      { id: '1', value: 10, updated_at: 1 },
      { id: '2', value: 5, updated_at: 2 },
      { id: '4', value: 30, updated_at: 3 },
      { id: '5', value: 100, updated_at: 5 },
    ]);

    expect(deadLetters).toHaveLength(1);
    expect(deadLetters[0].reason).toContain('outside expected range');

    const csvMetrics = metrics.find((entry) => entry.source === 'csv');
    expect(csvMetrics?.deduplicated).toBeGreaterThanOrEqual(1);
  });

  it('records lineage for every processed source', async () => {
    const pipeline = setupPipeline();
    await pipeline.run();
    const lineage = pipeline.lineageHistory();
    expect(lineage).not.toHaveLength(0);
    expect(lineage.map((event) => event.source)).toEqual(
      expect.arrayContaining(['csv', 'json', 'db'])
    );
  });

  it('honors schema versions from the registry for validation', async () => {
    const registry = new SchemaRegistry();
    registry.register({
      version: '1.0.0',
      schema: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
    });
    registry.register({
      version: '2.0.0',
      schema: {
        type: 'object',
        properties: { id: { type: 'string' }, region: { type: 'string' } },
        required: ['id', 'region'],
      },
    });

    const pipeline = new DataPipeline(
      [new JsonSource('json', [{ id: '1' }])],
      registry,
      new TransformationPipeline(),
      new DataQualityChecker(),
      {
        schemaVersion: '2.0.0',
        deduplicationKey: 'id',
        watermarkField: 'updated_at',
        qualityRules: {},
      }
    );

    const outcome = await pipeline.run();
    expect(outcome.processed).toHaveLength(0);
    expect(outcome.deadLetters).toHaveLength(1);
    expect(outcome.deadLetters[0].reason).toContain('required');
  });
});

describe('Scheduling blueprints', () => {
  it('builds Airflow and Temporal specs with tasks and metadata', () => {
    const tasks = [
      { id: 'extract', description: 'Ingest data', retries: 2 },
      { id: 'transform', description: 'Transform records', timeoutSeconds: 900 },
    ];
    const airflow = new AirflowScheduleBuilder('etl_dag').build('0 * * * *', tasks, {
      sla: '15m',
    });
    const temporal = new TemporalScheduleBuilder('etl_workflow').build('5m', tasks, {
      queue: 'critical',
    });

    expect(airflow.executor).toBe('airflow');
    expect(airflow.metadata?.dagId).toBe('etl_dag');
    expect(temporal.executor).toBe('temporal');
    expect(temporal.metadata?.workflow).toBe('etl_workflow');
  });
});

describe('ApiSource integration', () => {
  it('fetches and normalizes API payloads', async () => {
    const client = axios.create();
    jest.spyOn(client, 'get').mockResolvedValue({
      data: [{ id: '9', value: '12', updated_at: 9 }],
    });

    const source = new ApiSource('api', 'https://example.test/data', { client });
    const result = await source.load();
    expect(result.records[0]).toEqual({ id: '9', value: '12', updated_at: 9 });
  });

  it('captures ingestion failures without stopping the pipeline', async () => {
    const client = axios.create();
    jest.spyOn(client, 'get').mockRejectedValue(new Error('network down'));

    const registry = new SchemaRegistry();
    const schema = {
      type: 'object',
      properties: { id: { type: 'string' }, updated_at: { type: 'number' } },
      required: ['id'],
    };
    registry.register({ version: '1.0.0', schema });

    const source = new ApiSource('api', 'https://example.test/data', { client });
    const fallback = new JsonSource('json', [{ id: 'safe', updated_at: 1 }]);

    const pipeline = new DataPipeline(
      [source, fallback],
      registry,
      new TransformationPipeline(),
      new DataQualityChecker(),
      {
        schemaVersion: '1.0.0',
        deduplicationKey: 'id',
        watermarkField: 'updated_at',
        qualityRules: {},
      }
    );

    const outcome = await pipeline.run();
    expect(outcome.processed).toEqual([{ id: 'safe', updated_at: 1 }]);
    expect(outcome.deadLetters.some((entry) => entry.source === 'api')).toBe(true);
    const metrics = outcome.metrics.find((metric) => metric.source === 'api');
    expect(metrics?.ingestionErrors).toBeGreaterThanOrEqual(1);
  });

  it('paginates API responses using cursor params and response paths', async () => {
    const client = axios.create();
    const get = jest.spyOn(client, 'get');
    get
      .mockResolvedValueOnce({ data: { items: [{ id: 'a', updated_at: 1 }], next: 'c1' } })
      .mockResolvedValueOnce({ data: { items: [{ id: 'b', updated_at: 2 }], next: null } });

    const source = new ApiSource('api', 'https://example.test/data', {
      client,
      cursorParam: 'cursor',
      cursorPath: 'next',
      recordsPath: 'items',
      pageSizeParam: 'limit',
      pageSize: 50,
    });

    const first = await source.load();
    expect(first.records).toEqual([{ id: 'a', updated_at: 1 }]);
    expect(first.cursor).toBe('c1');
    expect(get).toHaveBeenCalledWith('https://example.test/data', {
      headers: undefined,
      params: { limit: 50 },
    });

    const second = await source.load(first.cursor);
    expect(second.records).toEqual([{ id: 'b', updated_at: 2 }]);
    expect(second.cursor).toBeUndefined();
    expect(get).toHaveBeenLastCalledWith('https://example.test/data', {
      headers: undefined,
      params: { cursor: 'c1', limit: 50 },
    });
  });
});

describe('DatabaseSource pagination', () => {
  it('iterates through paged results and honors watermarks', async () => {
    const registry = new SchemaRegistry();
    registry.register({
      version: '1.0.0',
      schema: {
        type: 'object',
        properties: { id: { type: 'string' }, updated_at: { type: 'number' } },
        required: ['id', 'updated_at'],
      },
    });

    let call = 0;
    const db = new IngestionAdapters.DatabaseSource('db', async () => {
      call += 1;
      if (call === 1) {
        return { rows: [{ id: '10', updated_at: 10 }], cursor: 'next' };
      }
      return { rows: [{ id: '11', updated_at: 9 }], cursor: undefined };
    });

    const pipeline = new DataPipeline(
      [db],
      registry,
      new TransformationPipeline(),
      new DataQualityChecker(),
      {
        schemaVersion: '1.0.0',
        deduplicationKey: 'id',
        watermarkField: 'updated_at',
        initialWatermark: 0,
        qualityRules: {},
        maxPagesPerSource: 5,
      }
    );

    const outcome = await pipeline.run();
    expect(outcome.processed).toEqual([{ id: '10', updated_at: 10 }]);
    const metrics = outcome.metrics[0];
    expect(metrics.processed).toBe(2);
    expect(metrics.filtered).toBe(1);
  });
});
