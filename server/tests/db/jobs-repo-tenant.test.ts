import { jest, describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import { JobsRepo } from '../../src/db/repositories/jobs.js';

describe('JobsRepo tenant partitioning', () => {
  const buildRepo = () => {
    const queries: Array<{ text: string; params: any[] }> = [];
    const client = {
      query: jest.fn(async (text: string, params: any[]) => {
        queries.push({ text, params });
        return { rows: [{ id: 'job-1', tenant_id: 'tenant-a' }] };
      }),
      release: jest.fn(),
    };
    const pool = {
      connect: jest.fn(async () => client),
    };

    return { repo: new JobsRepo(pool as any), queries, client, pool };
  };

  it('scopes inserts and reads by tenant with session context', async () => {
    const { repo, queries } = buildRepo();

    await repo.insert('tenant-a', {
      id: 'job-1',
      kind: 'embedding',
      status: 'queued',
      createdAt: new Date().toISOString(),
      meta: {},
    });

    await repo.findById('tenant-a', 'job-1');

    expect(queries[0].text).toContain('SET LOCAL app.current_tenant');
    expect(queries.find((q) => q.text.includes('INSERT INTO ai_jobs'))).toBeTruthy();
    const selectQuery = queries.find((q) => q.text.includes('SELECT * FROM ai_jobs'));
    expect(selectQuery?.params).toContain('tenant-a');
  });
});
