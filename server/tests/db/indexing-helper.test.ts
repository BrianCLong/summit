import { jest, describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import {
  buildCreateIndexSql,
  buildDropIndexSql,
  buildIndexName,
} from '../../src/db/migrations/indexing.js';

describe('managed index SQL helper', () => {
  const originalFlag = process.env.INDEX_CONCURRENT;

  afterEach(() => {
    process.env.INDEX_CONCURRENT = originalFlag;
  });

  it('builds a partial index with concurrent clause when the flag is enabled', () => {
    process.env.INDEX_CONCURRENT = '1';
    const result = buildCreateIndexSql({
      tableName: 'events',
      columns: ['tenant_id', 'created_at'],
      predicate: 'active = true',
    });

    expect(result.name).toBe('events_tenant_id_created_at_idx');
    expect(result.sql).toContain('CONCURRENTLY');
    expect(result.sql).toContain('WHERE active = true');
    expect(result.sql).toContain('"tenant_id", "created_at"');
    expect(result.concurrently).toBe(true);
  });

  it('omits concurrent builds when the feature flag is disabled', () => {
    process.env.INDEX_CONCURRENT = '0';
    const result = buildCreateIndexSql({
      tableName: 'cases',
      columns: ['id'],
      unique: true,
    });

    expect(result.sql).not.toContain('CONCURRENTLY');
    expect(result.sql).toContain('UNIQUE INDEX');
    expect(result.concurrently).toBe(false);
  });

  it('generates drop statements that honor concurrency', () => {
    process.env.INDEX_CONCURRENT = '1';
    const indexName = buildIndexName({ tableName: 'audit', columns: ['id'] });
    const result = buildDropIndexSql({ indexName });

    expect(result.sql).toContain('DROP INDEX CONCURRENTLY IF EXISTS');
    expect(result.sql).toContain(indexName);
  });
});
