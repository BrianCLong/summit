"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const query_cost_guard_1 = require("../query-cost-guard");
const cost_estimator_1 = require("../query-cost-guard/cost-estimator");
const budget_manager_1 = require("../query-cost-guard/budget-manager");
const slow_query_killer_1 = require("../query-cost-guard/slow-query-killer");
const postgres_1 = require("../../server/src/db/postgres");
const config = __importStar(require("../config"));
// Mock dependencies
jest.mock('../query-cost-guard/cost-estimator');
jest.mock('../query-cost-guard/slow-query-killer');
jest.mock('../../server/src/db/postgres', () => ({
    getPostgresPool: jest.fn(),
}));
jest.mock('../config');
const mockPool = {
    query: jest.fn(),
};
postgres_1.getPostgresPool.mockReturnValue(mockPool);
const mockEstimateQueryCost = cost_estimator_1.estimateQueryCost;
const mockTerminateSlowQuery = slow_query_killer_1.terminateSlowQuery;
const mockIsOpsGuardV1Enabled = jest.spyOn(config, 'isOpsGuardV1Enabled');
describe('QueryCostGuard Integration', () => {
    let guard;
    const testConfig = {
        tenantId: 'test-tenant',
        queryLabel: 'test-query',
        maxCost: 1000,
        timeoutMs: 5000,
    };
    beforeEach(() => {
        jest.clearAllMocks();
        budget_manager_1.budgetManager._clearForTesting();
        guard = new query_cost_guard_1.QueryCostGuard();
    });
    describe('Feature Flag Enabled', () => {
        beforeEach(() => {
            mockIsOpsGuardV1Enabled.mockReturnValue(true);
        });
        it('should execute a query if cost and budget are within limits', async () => {
            mockEstimateQueryCost.mockResolvedValue({ totalCost: 500 });
            mockPool.query.mockResolvedValue({ rows: [{ result: 'ok' }] });
            const result = await guard.execute('SELECT 1', [], testConfig);
            expect(result).toEqual({ rows: [{ result: 'ok' }] });
            expect(mockEstimateQueryCost).toHaveBeenCalledWith('SELECT 1', []);
            expect(mockPool.query).toHaveBeenCalledWith('SELECT 1', [], { label: 'test-query' });
            expect(budget_manager_1.budgetManager.getBudget('test-tenant').usage).toBe(500);
        });
        it('should throw an error if the estimated cost exceeds the max cost', async () => {
            mockEstimateQueryCost.mockResolvedValue({ totalCost: 1500 });
            await expect(guard.execute('SELECT 1', [], testConfig)).rejects.toThrow('Query cost estimate (1500) exceeds the maximum of 1000.');
            expect(mockPool.query).not.toHaveBeenCalled();
        });
        it('should throw an error if the budget is exceeded', async () => {
            budget_manager_1.budgetManager.setBudget('test-tenant', 1000);
            budget_manager_1.budgetManager.recordCost('test-tenant', 800);
            mockEstimateQueryCost.mockResolvedValue({ totalCost: 300 });
            await expect(guard.execute('SELECT 1', [], testConfig)).rejects.toThrow('Query budget exceeded.');
            expect(mockPool.query).not.toHaveBeenCalled();
        });
        it('should not call the slow query killer if the query finishes in time', async () => {
            jest.useFakeTimers();
            mockEstimateQueryCost.mockResolvedValue({ totalCost: 100 });
            mockPool.query.mockResolvedValue({ rows: [] });
            await guard.execute('SELECT 1', [], testConfig);
            jest.runAllTimers();
            expect(mockTerminateSlowQuery).not.toHaveBeenCalled();
            jest.useRealTimers();
        });
    });
    describe('Feature Flag Disabled', () => {
        it('should execute the query directly without any checks', async () => {
            mockIsOpsGuardV1Enabled.mockReturnValue(false);
            mockPool.query.mockResolvedValue({ rows: [{ result: 'direct' }] });
            const result = await guard.execute('SELECT 1', [], testConfig);
            expect(result).toEqual({ rows: [{ result: 'direct' }] });
            expect(mockEstimateQueryCost).not.toHaveBeenCalled();
            expect(mockPool.query).toHaveBeenCalledWith('SELECT 1', [], { label: 'test-query' });
            expect(budget_manager_1.budgetManager.getBudget('test-tenant').usage).toBe(0);
        });
    });
});
