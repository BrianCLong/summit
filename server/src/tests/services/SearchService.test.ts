import type { Pool } from 'pg';
import { SearchService } from '../../services/SearchService.js';

describe('SearchService', () => {
  test('falls back to PostgreSQL search when Elasticsearch is unavailable', async () => {
    const queryMock = jest.fn(async (sql: string) => {
      if (sql.includes('information_schema.columns')) {
        return {
          rows: [
            { column_name: 'id' },
            { column_name: 'tenant_id' },
            { column_name: 'title' },
            { column_name: 'content' },
            { column_name: 'ingested_at' },
          ],
        };
      }

      if (sql.includes('FROM entities')) {
        return {
          rows: [
            {
              id: 'entity-1',
              tenant_id: 'tenant-123',
              kind: 'PERSON',
              props: { name: 'Ada Lovelace' },
              created_at: new Date('2024-01-01T00:00:00Z'),
              updated_at: new Date('2024-01-02T00:00:00Z'),
            },
          ],
        };
      }

      if (sql.includes('FROM ingested_documents')) {
        return {
          rows: [
            {
              id: 'doc-1',
              tenant_id: 'tenant-123',
              title: 'Operational Briefing',
              content: 'Briefing content discussing operations in detail.',
              ts: new Date('2024-01-03T00:00:00Z'),
            },
          ],
        };
      }

      return { rows: [] };
    });

    const pool = { query: queryMock } as unknown as Pool;
    const service = new SearchService({ pool });

    const response = await service.fullTextSearch({ tenantId: 'tenant-123', query: 'operations' });

    expect(response.total).toBe(2);
    expect(response.results).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'entity-1', source: 'GRAPH' }),
        expect.objectContaining({ id: 'doc-1', source: 'INGESTED' }),
      ]),
    );
  });

  test('uses Elasticsearch results when available', async () => {
    const searchMock = jest.fn(async () => ({
      hits: {
        hits: [
          {
            _id: 'hit-1',
            _score: 1.23,
            _source: {
              type: 'PERSON',
              tenantId: 'tenant-abc',
              title: 'Dana Analyst',
              summary: 'Threat analyst with deep expertise.',
              source: 'graph',
            },
          },
        ],
        total: { value: 1 },
      },
      took: 7,
    }));

    const pool = { query: jest.fn() } as unknown as Pool;
    const service = new SearchService({ client: { search: searchMock } as any, pool });

    const response = await service.fullTextSearch({ tenantId: 'tenant-abc', query: 'dana' });

    expect(searchMock).toHaveBeenCalled();
    expect(pool.query).not.toHaveBeenCalled();
    expect(response.results[0]).toMatchObject({ id: 'hit-1', title: 'Dana Analyst', source: 'GRAPH' });
    expect(response.tookMs).toBe(7);
  });
});
