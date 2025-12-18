import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { NormalizationStage } from '../stages/normalization.js';
import { PipelineContext } from '../pipeline.js';
import { Logger } from 'pino';

const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  child: jest.fn(() => mockLogger),
} as unknown as Logger;

describe('NormalizationStage', () => {
  let ctx: PipelineContext;

  beforeEach(() => {
    ctx = {
      pipeline: {
        key: 'test-pipe',
        tenantId: 't1',
        name: 'Test',
        source: { type: 'api', config: {} },
        stages: ['normalize'],
      },
      runId: 'run1',
      tenantId: 't1',
      logger: mockLogger,
    };
  });

  it('should normalize documents', async () => {
    const stage = new NormalizationStage({});
    const input = [{ text: 'Hello world', id: 'doc1', title: 'My Doc' }];

    const output = await stage.process(ctx, input);

    expect(output).toHaveLength(1);
    expect(output[0]).toMatchObject({
      tenantId: 't1',
      text: 'Hello world',
      title: 'My Doc',
    });
    expect(output[0].source.id).toBe('doc1');
  });

  it('should normalize entities', async () => {
    const stage = new NormalizationStage({ entityType: 'person' });
    const input = [{ name: 'Alice', age: 30 }];

    const output = await stage.process(ctx, input);

    expect(output).toHaveLength(1);
    expect(output[0]).toMatchObject({
      tenantId: 't1',
      kind: 'person',
      properties: { name: 'Alice', age: 30 }
    });
  });
});
