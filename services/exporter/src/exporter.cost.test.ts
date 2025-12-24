import { createExport } from './exporter';
import { emitCostEvent } from '../../finops/cost-events';
import { jest } from '@jest/globals';

jest.mock('../../finops/cost-events');

describe('Exporter Cost Events', () => {
  it('should emit a cost event on successful export', async () => {
    // Arrange
    const request = {
      tenantId: 'test-tenant',
      scopeId: 'test-scope',
      entities: [{ id: 1, name: 'Entity 1' }],
      edges: [],
      redactRules: [],
      format: ['json' as const],
    };
    const expectedCorrelationId = expect.any(String);

    // Act
    await createExport(request);

    // Assert
    expect(emitCostEvent).toHaveBeenCalledWith({
      operationType: 'export',
      tenantId: 'test-tenant',
      scopeId: 'test-scope',
      correlationId: expectedCorrelationId,
      dimensions: {
        io_bytes: expect.any(Number),
        objects_written: 2,
        cpu_ms: expect.any(Number),
      },
    });
  });
});
