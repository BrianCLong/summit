import { QueryExecutor } from './QueryExecutor';
import { emitCostEvent } from '../../../../finops/cost-events/index';
import { jest } from '@jest/globals';

jest.mock('../../../../finops/cost-events/index');

describe('QueryExecutor Cost Events', () => {
    it('should emit a cost event on successful query execution', async () => {
        // Arrange
        const connections = {
            postgres: {
                query: jest.fn().mockResolvedValue({ rows: [{ 'count_id': 10 }] }),
            },
        };
        const executor = new QueryExecutor(connections as any);
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
        await executor.execute(query as any, context as any);

        // Assert
        expect(emitCostEvent).toHaveBeenCalledWith({
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
