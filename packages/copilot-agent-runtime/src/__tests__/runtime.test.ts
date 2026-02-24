import { AgentRuntime, AgentConfig, AgentLogger } from '../index';

// Mock Logger
class MockLogger implements AgentLogger {
  info = jest.fn();
  warn = jest.fn();
  error = jest.fn();
}

describe('AgentRuntime', () => {
  let runtime: AgentRuntime;
  let mockLogger: MockLogger;
  let config: AgentConfig;

  beforeEach(() => {
    mockLogger = new MockLogger();
    config = {
      agentId: 'test-agent',
      capabilities: ['test-capability'],
      correlationId: 'test-correlation-id',
      logger: mockLogger,
    };
    runtime = new AgentRuntime(config);
  });

  test('should initialize with correct config and logger', () => {
    expect(runtime).toBeDefined();
  });

  test('should log initialization with correlationId', async () => {
    await runtime.initialize();
    expect(mockLogger.info).toHaveBeenCalledWith('Initializing agent', {
      agentId: 'test-agent',
      correlationId: 'test-correlation-id',
    });
  });

  test('health check should return healthy', () => {
    const health = runtime.health();
    expect(health.status).toBe('healthy');
    expect(health.details.agentId).toBe('test-agent');
  });

  test('should log goal execution steps with correlationId', async () => {
    const goal = 'test-goal';
    await runtime.runGoal(goal);

    expect(mockLogger.info).toHaveBeenCalledWith('Received goal', expect.objectContaining({
      goal,
      correlationId: 'test-correlation-id',
    }));

    expect(mockLogger.info).toHaveBeenCalledWith('Planning for goal', expect.objectContaining({
      goal,
      correlationId: 'test-correlation-id',
    }));

    expect(mockLogger.info).toHaveBeenCalledWith('Executing step', expect.objectContaining({
      step: 'step1',
      correlationId: 'test-correlation-id',
    }));
  });

  test('should handle errors and log them', async () => {
    const error = new Error('Test error');
    // Mock plan to throw error
    jest.spyOn(runtime as any, 'plan').mockRejectedValue(error);

    await expect(runtime.runGoal('fail-goal')).rejects.toThrow('Test error');

    expect(mockLogger.error).toHaveBeenCalledWith('Goal execution failed', expect.objectContaining({
      goal: 'fail-goal',
      error: error,
    }));
  });
});
