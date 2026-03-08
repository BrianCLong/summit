"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const pkHash_js_1 = require("../pkHash.js");
const handleDelete_js_1 = require("../handleDelete.js");
describe('Canary Delete Logic', () => {
    test('PK Hash Stability', () => {
        const key1 = { id: 123, type: 'test' };
        const key2 = { type: 'test', id: 123 };
        const json1 = (0, pkHash_js_1.stablePkJson)(key1);
        const json2 = (0, pkHash_js_1.stablePkJson)(key2);
        expect(json1).toBe(json2);
        expect((0, pkHash_js_1.computePkHash)(json1)).toBe((0, pkHash_js_1.computePkHash)(json2));
    });
    test('handleDelete Flow', async () => {
        const mockQuery = globals_1.jest.fn().mockResolvedValue({ rowCount: 1 });
        const mockPgPool = { query: mockQuery };
        const mockRun = globals_1.jest.fn().mockResolvedValue({
            records: [{ get: () => ({ elementId: '123', identity: { toString: () => '123' } }) }]
        });
        const mockTx = { run: mockRun };
        const mockSession = {
            executeWrite: (cb) => cb(mockTx),
            close: globals_1.jest.fn()
        };
        const mockDriver = { session: () => mockSession };
        const mockEmit = globals_1.jest.fn();
        const mockOpenLineage = { emit: mockEmit };
        const message = {
            payload: {
                op: 'd',
                source: { db: 'mydb', schema: 'public', table: 'mytable', lsn: 100, txId: 500, ts_ms: 1600000000000 },
                before: { id: 1 }
            }
        };
        await (0, handleDelete_js_1.handleDelete)(mockPgPool, mockDriver, mockOpenLineage, message);
        // Verify Postgres insert
        expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO reconcile.deleted_rows'), expect.arrayContaining(['postgres', 'mydb', 'public', 'mytable']));
        // Verify Neo4j execution
        expect(mockRun).toHaveBeenCalledWith(expect.stringContaining('MERGE (ev:DeletionEvent'), expect.objectContaining({
            source: 'postgres',
            table: 'mytable',
            pk: 1
        }));
        // Verify OpenLineage emission
        expect(mockEmit).toHaveBeenCalledWith(expect.objectContaining({
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
        }));
    });
});
