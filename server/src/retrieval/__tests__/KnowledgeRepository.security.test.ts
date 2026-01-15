
import { KnowledgeRepository } from '../KnowledgeRepository.js';
import { RetrievalQuery } from '../types.js';
import { describe, it, expect } from '@jest/globals';

describe('KnowledgeRepository security', () => {
  it('blocks SQL injection in topK', async () => {
  let executedSql = '';
  let executedParams: any[] = [];

  const mockClient = {
    query: async (sql: string, params: any[]) => {
      executedSql = sql;
      executedParams = params;
      return { rows: [] };
    },
    release: () => {},
  };

  const mockPool = {
    connect: async () => mockClient,
  } as any;

  const repo = new KnowledgeRepository(mockPool);

  const maliciousQuery = {
    tenantId: 'tenant-1',
    queryKind: 'keyword',
    queryText: 'test',
    topK: '10; DROP TABLE knowledge_objects; --' as any,
  } as RetrievalQuery;

  await repo.searchKeyword(maliciousQuery);

  expect(executedSql).not.toMatch(/DROP TABLE/);
  expect(executedSql).toMatch(/LIMIT \$\d+/);
  expect(executedParams[executedParams.length - 1]).toBe(10);
  });

  it('parses string topK', async () => {
  let executedParams: any[] = [];

  const mockClient = {
    query: async (sql: string, params: any[]) => {
      executedParams = params;
      return { rows: [] };
    },
    release: () => {},
  };

  const mockPool = {
    connect: async () => mockClient,
  } as any;

  const repo = new KnowledgeRepository(mockPool);

  const query = {
    tenantId: 'tenant-1',
    queryKind: 'keyword',
    queryText: 'test',
    topK: '50',
  } as any;

  await repo.searchKeyword(query);

  expect(executedParams[executedParams.length - 1]).toBe(50);
  });
});
