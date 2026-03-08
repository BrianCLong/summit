"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const rollback_engine_1 = require("../../../lib/deployment/rollback-engine");
// Mock the external services. This approach assumes the mocks are part of the module.
// A better approach in a real app would be dependency injection.
globals_1.jest.mock('../../../lib/deployment/rollback-engine', () => {
    // Important: Return the actual class constructor
    const originalModule = globals_1.jest.requireActual('../../../lib/deployment/rollback-engine');
    return {
        ...originalModule,
        // Mocked dependencies that the class uses
        mockKubernetesClient: {
            rollbackDeployment: globals_1.jest.fn(),
        },
        mockDbMigrator: {
            runDownMigrations: globals_1.jest.fn(),
        },
    };
});
// Get a reference to the mocked dependencies
const { mockKubernetesClient, mockDbMigrator } = globals_1.jest.requireMock('../../../lib/deployment/rollback-engine');
(0, globals_1.describe)('RollbackEngine', () => {
    let rollbackEngine;
    (0, globals_1.beforeEach)(() => {
        globals_1.jest.clearAllMocks();
        rollbackEngine = new rollback_engine_1.RollbackEngine();
    });
    (0, globals_1.it)('should perform a standard service rollback successfully', async () => {
        const options = { serviceName: 'test-app', reason: 'Critical bug detected' };
        const result = await rollbackEngine.performRollback(options);
        (0, globals_1.expect)(result).toBe(true);
        (0, globals_1.expect)(mockKubernetesClient.rollbackDeployment).toHaveBeenCalledWith('test-app');
        (0, globals_1.expect)(mockDbMigrator.runDownMigrations).not.toHaveBeenCalled();
        const history = rollbackEngine.getRollbackHistory();
        (0, globals_1.expect)(history).toHaveLength(1);
        (0, globals_1.expect)(history[0]).toMatchObject({ serviceName: 'test-app', reason: 'Critical bug detected', success: true });
    });
    (0, globals_1.it)('should include database migration rollback when specified', async () => {
        const options = { serviceName: 'data-service', reason: 'Schema mismatch', migrationSteps: 2 };
        await rollbackEngine.performRollback(options);
        (0, globals_1.expect)(mockKubernetesClient.rollbackDeployment).toHaveBeenCalledWith('data-service');
        (0, globals_1.expect)(mockDbMigrator.runDownMigrations).toHaveBeenCalledWith(2);
        const history = rollbackEngine.getRollbackHistory();
        (0, globals_1.expect)(history[0]).toMatchObject({ migrationSteps: 2, success: true });
    });
    (0, globals_1.it)('should log a failed rollback if an error occurs', async () => {
        const error = new Error('Kube API unavailable');
        mockKubernetesClient.rollbackDeployment.mockRejectedValue(error);
        const options = { serviceName: 'failing-service', reason: 'Deployment error' };
        const result = await rollbackEngine.performRollback(options);
        (0, globals_1.expect)(result).toBe(false);
        const history = rollbackEngine.getRollbackHistory();
        (0, globals_1.expect)(history).toHaveLength(1);
        (0, globals_1.expect)(history[0].success).toBe(false);
    });
});
