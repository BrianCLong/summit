import { RollbackEngine } from '../../../lib/deployment/rollback-engine';

// Mock the external services. This approach assumes the mocks are part of the module.
// A better approach in a real app would be dependency injection.
jest.mock('../../../lib/deployment/rollback-engine', () => {
  // Important: Return the actual class constructor
  const originalModule = jest.requireActual('../../../lib/deployment/rollback-engine');
  return {
    ...originalModule,
    // Mocked dependencies that the class uses
    mockKubernetesClient: {
      rollbackDeployment: jest.fn(),
    },
    mockDbMigrator: {
      runDownMigrations: jest.fn(),
    },
  };
});

// Get a reference to the mocked dependencies
const { mockKubernetesClient, mockDbMigrator } = jest.requireMock('../../../lib/deployment/rollback-engine');

describe('RollbackEngine', () => {
  let rollbackEngine: RollbackEngine;

  beforeEach(() => {
    jest.clearAllMocks();
    rollbackEngine = new RollbackEngine();
  });

  it('should perform a standard service rollback successfully', async () => {
    const options = { serviceName: 'test-app', reason: 'Critical bug detected' };
    const result = await rollbackEngine.performRollback(options);

    expect(result).toBe(true);
    expect(mockKubernetesClient.rollbackDeployment).toHaveBeenCalledWith('test-app');
    expect(mockDbMigrator.runDownMigrations).not.toHaveBeenCalled();

    const history = rollbackEngine.getRollbackHistory();
    expect(history).toHaveLength(1);
    expect(history[0]).toMatchObject({ serviceName: 'test-app', reason: 'Critical bug detected', success: true });
  });

  it('should include database migration rollback when specified', async () => {
    const options = { serviceName: 'data-service', reason: 'Schema mismatch', migrationSteps: 2 };
    await rollbackEngine.performRollback(options);

    expect(mockKubernetesClient.rollbackDeployment).toHaveBeenCalledWith('data-service');
    expect(mockDbMigrator.runDownMigrations).toHaveBeenCalledWith(2);

    const history = rollbackEngine.getRollbackHistory();
    expect(history[0]).toMatchObject({ migrationSteps: 2, success: true });
  });

  it('should log a failed rollback if an error occurs', async () => {
    const error = new Error('Kube API unavailable');
    mockKubernetesClient.rollbackDeployment.mockRejectedValue(error);

    const options = { serviceName: 'failing-service', reason: 'Deployment error' };
    const result = await rollbackEngine.performRollback(options);

    expect(result).toBe(false);

    const history = rollbackEngine.getRollbackHistory();
    expect(history).toHaveLength(1);
    expect(history[0].success).toBe(false);
  });
});
