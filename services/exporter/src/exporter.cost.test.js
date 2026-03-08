"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const exporter_1 = require("./exporter");
const cost_events_1 = require("../../finops/cost-events");
const globals_1 = require("@jest/globals");
globals_1.jest.mock('../../finops/cost-events');
describe('Exporter Cost Events', () => {
    it('should emit a cost event on successful export', async () => {
        // Arrange
        const request = {
            tenantId: 'test-tenant',
            scopeId: 'test-scope',
            entities: [{ id: 1, name: 'Entity 1' }],
            edges: [],
            redactRules: [],
            format: ['json'],
        };
        const expectedCorrelationId = expect.any(String);
        // Act
        await (0, exporter_1.createExport)(request);
        // Assert
        expect(cost_events_1.emitCostEvent).toHaveBeenCalledWith({
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
