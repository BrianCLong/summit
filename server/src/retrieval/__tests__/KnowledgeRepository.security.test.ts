
import { test } from 'node:test';
import assert from 'node:assert';
import { KnowledgeRepository } from '../KnowledgeRepository.js';
import { RetrievalQuery } from '../types.js';

test('KnowledgeRepository: Security Regression Test (SQL Injection)', async (t) => {
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

  assert.doesNotMatch(executedSql, /DROP TABLE/, 'Malicious SQL should NOT be in the query string');
  assert.match(executedSql, /LIMIT \$\d+/, 'LIMIT should be parameterized');
  assert.strictEqual(executedParams[executedParams.length - 1], 10, 'Should fall back to default limit of 10 when input is invalid');
});

test('KnowledgeRepository: Handles String topK', async (t) => {
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

  assert.strictEqual(executedParams[executedParams.length - 1], 50, 'Should parse string topK');
});
