import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  BulkScanner,
  ClassificationEngine,
  HybridEntityRecognizer,
  PATTERN_COUNT,
  TaxonomyManager,
  VerificationQueue,
} from '../../src/pii/index.js';
import type { ClassifiedEntity } from '../../src/pii/types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const loadDataset = () => {
  const datasetPath = path.resolve(__dirname, '../../data/pii/benchmark.json');
  return JSON.parse(fs.readFileSync(datasetPath, 'utf-8'));
};

describe('Semantic PII Mapping Engine', () => {
  it('includes more than 50 PII detection patterns', () => {
    expect(PATTERN_COUNT).toBeGreaterThanOrEqual(50);
  });

  it('recognizes structured PII entities with contextual boosts', async () => {
    const recognizer = new HybridEntityRecognizer();
    const result = await recognizer.recognize({
      value:
        'Contact Liam via email at liam@example.com or call +1 415 555 1212. Passport: XG4521987',
      schemaField: {
        fieldName: 'passport',
        description: 'Passport number',
        piiHints: ['passportNumber'],
      },
    });

    const types = result.entities.map((entity) => entity.type);
    expect(types).toEqual(
      expect.arrayContaining(['email', 'phoneNumber', 'passportNumber']),
    );
    const passport = result.entities.find(
      (entity) => entity.type === 'passportNumber',
    );
    expect(passport?.confidence).toBeGreaterThan(0.7);
  });

  it('applies taxonomy severity and schema metadata correctly', async () => {
    const recognizer = new HybridEntityRecognizer();
    const taxonomy = new TaxonomyManager();
    const engine = new ClassificationEngine(recognizer, taxonomy);

    const classification = await engine.classify('123-45-6789', {
      value: '123-45-6789',
      schema: {
        name: 'sensitive_records',
        fields: [
          {
            fieldName: 'ssn',
            description: 'Social Security Number',
            piiHints: ['socialSecurityNumber'],
            riskLevel: 'critical',
          },
        ],
      },
      schemaField: {
        fieldName: 'ssn',
        description: 'Social Security Number',
        piiHints: ['socialSecurityNumber'],
        riskLevel: 'critical',
      },
      recordId: 'rec-1',
    });

    expect(classification.entities).toHaveLength(1);
    const entity = classification.entities[0];
    expect(entity.type).toBe('socialSecurityNumber');
    expect(entity.severity).toBe('critical');
    expect(entity.categories).toContain('identity');
    expect(entity.policyTags).toContain('restricted');
  });

  it('supports incremental bulk scanning with change tracking', async () => {
    const dataset = loadDataset();
    const recognizer = new HybridEntityRecognizer();
    const engine = new ClassificationEngine(recognizer, new TaxonomyManager());
    const scanner = new BulkScanner(engine);

    const records = dataset.records.map((record: any) => ({
      id: record.id,
      tableName: record.table,
      value: record.data,
      schema: record.schema,
      updatedAt: new Date().toISOString(),
    }));

    const firstReport = await scanner.scan(records, {
      incremental: true,
      includeUnchanged: true,
      minimumConfidence: 0.5,
    });
    expect(firstReport.results.length).toBeGreaterThan(0);
    const customer = firstReport.results.find(
      (item) => item.recordId === 'customer-001',
    );
    expect(
      customer?.detected.find(
        (entity: ClassifiedEntity) => entity.type === 'socialSecurityNumber',
      ),
    ).toBeDefined();

    const secondReport = await scanner.scan(records, {
      incremental: true,
      includeUnchanged: true,
      minimumConfidence: 0.5,
    });
    expect(secondReport.results.length).toBeGreaterThan(0);
    expect(
      secondReport.results.every((result) => result.changed === false),
    ).toBe(true);

    const mutatedRecords = records.map((record: any) =>
      record.id === 'customer-001'
        ? {
            ...record,
            value: { ...record.value, email: 'ava.updated@example.com' },
            updatedAt: new Date(Date.now() + 1000).toISOString(),
          }
        : record,
    );

    const thirdReport = await scanner.scan(mutatedRecords, {
      incremental: true,
      includeUnchanged: true,
      minimumConfidence: 0.5,
    });
    const changed = thirdReport.results.find(
      (result) => result.recordId === 'customer-001',
    );
    expect(changed?.changed).toBe(true);
  });

  it('enqueues low-confidence detections for human verification', async () => {
    const queue = new VerificationQueue({ minimumConfidence: 0.95 });
    const entity: ClassifiedEntity = {
      id: 'entity-1',
      type: 'email',
      value: 'example@example.com',
      start: 0,
      end: 5,
      detectors: ['pattern:test'],
      confidence: 0.8,
      rawScore: 0.8,
      severity: 'high',
      taxonomy: 'global-default',
      categories: ['contact'],
      policyTags: ['confidential'],
      context: {
        text: 'example@example.com',
        before: '',
        after: '',
        schemaField: 'email',
      },
    };

    expect(queue.shouldEnqueue(entity)).toBe(true);
    const task = await queue.enqueue(entity);
    expect(task.status).toBe('pending');
    const resolved = await queue.resolve(
      task.taskId,
      'approved',
      'qa.user',
      'Validated PII match',
    );
    expect(resolved.status).toBe('approved');
    expect(queue.list('approved')).toHaveLength(1);
  });
});
