import { jest } from '@jest/globals';
import { stablePkJson, computePkHash } from '../pkHash.js';
import { handleDelete } from '../handleDelete.js';
import { Driver } from 'neo4j-driver';
import { Pool } from 'pg';

describe('Canary Delete Logic', () => {
  test('PK Hash Stability', () => {
    const key1 = { id: 123, type: 'test' };
    const key2 = { type: 'test', id: 123 };

    const json1 = stablePkJson(key1);
    const json2 = stablePkJson(key2);

    expect(json1).toBe(json2);
    expect(computePkHash(json1)).toBe(computePkHash(json2));
  });

  test('handleDelete Flow', async () => {
    const mockQuery = jest.fn().mockResolvedValue({ rowCount: 1 });
    const mockPgPool = { query: mockQuery } as unknown as Pool;

    const mockRun = jest.fn().mockResolvedValue({
      records: [{ get: () => ({ elementId: '123', identity: { toString: () => '123' } }) }]
    });
    const mockTx = { run: mockRun };
    const mockSession = {
      executeWrite: (cb: any) => cb(mockTx),
      close: jest.fn()
    };
    const mockDriver = { session: () => mockSession } as unknown as Driver;

    const mockEmit = jest.fn();
    const mockOpenLineage = { emit: mockEmit };

    const message = {
      payload: {
        op: 'd',
        source: { db: 'mydb', schema: 'public', table: 'mytable', lsn: 100, txId: 500, ts_ms: 1600000000000 },
        before: { id: 1 }
      }
    };

    await handleDelete(mockPgPool, mockDriver, mockOpenLineage, message);

    // Verify Postgres insert
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO reconcile.deleted_rows'),
      expect.arrayContaining(['postgres', 'mydb', 'public', 'mytable'])
    );

    // Verify Neo4j execution
    expect(mockRun).toHaveBeenCalledWith(
      expect.stringContaining('MERGE (ev:DeletionEvent'),
      expect.objectContaining({
        source: 'postgres',
        table: 'mytable',
        pk: 1
      })
    );

    // Verify OpenLineage emission
    expect(mockEmit).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'COMPLETE',
        outputs: expect.arrayContaining([
          expect.objectContaining({
            facets: expect.objectContaining({
              prov: expect.objectContaining({
                wasInvalidatedBy: expect.objectContaining({
                  activityId: '123'
                })
              })
            })
          })
        ])
      })
    );
  });
});
