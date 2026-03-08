"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const RiskRepository_js_1 = require("../RiskRepository.js");
const pg_js_1 = require("../../pg.js");
(0, globals_1.describe)('RiskRepository', () => {
    let repo;
    (0, globals_1.beforeEach)(() => {
        repo = new RiskRepository_js_1.RiskRepository();
        globals_1.jest.clearAllMocks();
    });
    (0, globals_1.it)('should use batched insert for signals', async () => {
        const txMock = {
            query: globals_1.jest.fn()
        };
        const transactionSpy = globals_1.jest.spyOn(pg_js_1.pg, 'transaction').mockImplementation(async (cb) => {
            return await cb(txMock);
        });
        txMock.query
            .mockResolvedValueOnce([{ id: 'score-1' }]) // insert risk_scores
            .mockResolvedValueOnce([
            { id: 'sig-1', risk_score_id: 'score-1', type: 's1', value: '1', weight: '0.5', contribution_score: '0.5', source: 'src', description: 'd1', detected_at: new Date() },
            { id: 'sig-2', risk_score_id: 'score-1', type: 's2', value: '2', weight: '0.5', contribution_score: '1.0', source: 'src', description: 'd2', detected_at: new Date() }
        ]); // insert risk_signals (batch)
        const input = {
            tenantId: 't1',
            entityId: 'e1',
            entityType: 'Person',
            score: 0.5,
            level: 'medium',
            window: '24h',
            modelVersion: '1',
            signals: [
                { type: 's1', value: 1, weight: 0.5, contributionScore: 0.5 },
                { type: 's2', value: 2, weight: 0.5, contributionScore: 1.0 }
            ]
        };
        await repo.saveRiskScore(input);
        (0, globals_1.expect)(transactionSpy).toHaveBeenCalled();
        (0, globals_1.expect)(txMock.query).toHaveBeenCalledTimes(2);
        const calls = txMock.query.mock.calls;
        (0, globals_1.expect)(calls[0][0]).toContain('INSERT INTO risk_scores');
        (0, globals_1.expect)(calls[1][0]).toContain('INSERT INTO risk_signals');
        (0, globals_1.expect)(calls[1][0]).toContain('VALUES ($1, $2, $3, $4, $5, $6, $7, $8), ($9, $10, $11, $12, $13, $14, $15, $16)');
        transactionSpy.mockRestore();
    });
    (0, globals_1.it)('should propagate errors if batch fails', async () => {
        const txMock = {
            query: globals_1.jest.fn()
        };
        const transactionSpy = globals_1.jest.spyOn(pg_js_1.pg, 'transaction').mockImplementation(async (cb) => {
            return await cb(txMock);
        });
        txMock.query
            .mockResolvedValueOnce([{ id: 'score-1' }]) // insert risk_scores
            .mockRejectedValueOnce(new Error('Batch failed')); // batch signals fail
        const input = {
            tenantId: 't1',
            entityId: 'e1',
            entityType: 'Person',
            score: 0.5,
            level: 'medium',
            window: '24h',
            modelVersion: '1',
            signals: [
                { type: 's1', value: 1, weight: 0.5, contributionScore: 0.5 },
                { type: 's2', value: 2, weight: 0.5, contributionScore: 1.0 }
            ]
        };
        await (0, globals_1.expect)(repo.saveRiskScore(input)).rejects.toThrow('Batch failed');
        (0, globals_1.expect)(txMock.query).toHaveBeenCalledTimes(2);
        transactionSpy.mockRestore();
    });
});
