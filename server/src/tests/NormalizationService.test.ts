import { NormalizationService } from '../ingestion/NormalizationService';
import { ConnectorContext } from '../data-model/types';
import { describe, it, expect } from '@jest/globals';

describe('NormalizationService', () => {
  it('should normalize document records', async () => {
    const service = new NormalizationService();
    const ctx: ConnectorContext = {
      tenantId: 'test-tenant',
      pipelineKey: 'test-pipeline',
      logger: console
    };

    const raw = [{ text: 'Hello World', title: 'Test Doc' }];
    const result = await service.normalize(raw, ctx);

    expect(result.documents).toHaveLength(1);
    expect(result.documents[0].title).toBe('Test Doc');
    expect(result.documents[0].tenantId).toBe('test-tenant');
  });

  it('should normalize entity records', async () => {
    const service = new NormalizationService();
    const ctx: ConnectorContext = {
      tenantId: 'test-tenant',
      pipelineKey: 'test-pipeline',
      logger: console
    };

    const raw = [{ id: 'e1', type: 'person', labels: ['VIP'] }];
    const result = await service.normalize(raw, ctx);

    expect(result.entities).toHaveLength(1);
    expect(result.entities[0].id).toBe('e1');
    expect(result.entities[0].kind).toBe('custom'); // Default fallback
  });
});
