"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const RiskRepository_js_1 = require("../repositories/RiskRepository.js");
const pg_js_1 = require("../../db/pg.js");
const globals_1 = require("@jest/globals");
describe('RiskRepository Performance', () => {
    let riskRepository;
    let mockTx;
    beforeEach(() => {
        riskRepository = new RiskRepository_js_1.RiskRepository();
        mockTx = {
            query: globals_1.jest.fn().mockImplementation((query) => {
                if (query.includes('INSERT INTO risk_scores')) {
                    return Promise.resolve([{ id: 'test-score-id' }]);
                }
                return Promise.resolve([]);
            }),
        };
        // Mock pg.transaction to execute the callback with our mockTx
        globals_1.jest.spyOn(pg_js_1.pg, 'transaction').mockImplementation((cb) => {
            return cb(mockTx);
        });
    });
    afterEach(() => {
        globals_1.jest.restoreAllMocks();
    });
    it('should use batched insertion for signals', async () => {
        const signals = Array.from({ length: 20 }, (_, i) => ({
            type: `type-${i}`,
            source: 'test',
            value: i,
            weight: 1,
            contributionScore: i,
            description: `desc-${i}`,
        }));
        await riskRepository.saveRiskScore({
            tenantId: 't1',
            entityId: 'e1',
            entityType: 'user',
            score: 50,
            level: 'medium',
            window: '24h',
            modelVersion: '1.0.0',
            rationale: 'test',
            signals,
        });
        // Verify INSERT INTO risk_scores was called once
        expect(mockTx.query).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO risk_scores'), expect.any(Array));
        // Verify INSERT INTO risk_signals was called once (since 20 < 100)
        // instead of 20 times.
        const signalInserts = mockTx.query.mock.calls.filter((call) => call[0].includes('INSERT INTO risk_signals'));
        expect(signalInserts.length).toBe(1);
        // 20 signals * 8 params = 160 values
        expect(signalInserts[0][1].length).toBe(160);
    });
});
