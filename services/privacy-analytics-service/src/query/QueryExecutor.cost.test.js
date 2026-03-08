"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const QueryExecutor_1 = require("./QueryExecutor");
const index_1 = require("../../../../finops/cost-events/index");
const globals_1 = require("@jest/globals");
globals_1.jest.mock('../../../../finops/cost-events/index');
describe('QueryExecutor Cost Events', () => {
    it('should emit a cost event on successful query execution', async () => {
        // Arrange
        const connections = {
            postgres: {
                query: globals_1.jest.fn().mockResolvedValue({ rows: [{ 'count_id': 10 }] }),
            },
        };
        const executor = new QueryExecutor_1.QueryExecutor(connections);
        const query = {
            source: 'users',
            measures: [{ field: 'id', aggregation: 'count' }],
            dimensions: [],
        };
        const context = {
            tenantId: 'test-tenant',
            userId: 'test-user',
            policies: [],
        };
        const expectedCorrelationId = expect.any(String);
        // Act
        await executor.execute(query, context);
        // Assert
        expect(index_1.emitCostEvent).toHaveBeenCalledWith({
            operationType: 'query',
            tenantId: 'test-tenant',
            scopeId: 'users',
            correlationId: expectedCorrelationId,
            dimensions: {
                query_complexity: 2,
                rows_scanned: 1,
                rows_returned: 1,
                cpu_ms: expect.any(Number),
            },
        });
    });
});
