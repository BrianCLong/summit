import { RedTeamSimulator } from '../RedTeamSimulator';
import { SimulationEngineService } from '../SimulationEngineService';
import { EventEmitter } from 'events';

// Mock dependencies
jest.mock('../../utils/logger', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  }
}));

jest.mock('../../workers/eventBus', () => {
  const EventEmitter = require('events');
  return new EventEmitter();
});

const eventBus = require('../../workers/eventBus');

// Mock SimulationEngineService as a class that extends EventEmitter
class MockSimulationEngineService extends EventEmitter {
  runSimulation = jest.fn();
  getSimulationStatus = jest.fn();
}

describe('RedTeamSimulator', () => {
  let redTeamSimulator: RedTeamSimulator;
  let mockEngine: MockSimulationEngineService;

  beforeEach(() => {
    // Instantiate the mock engine
    mockEngine = new MockSimulationEngineService();
    // Spy on the 'on' method to verify listeners are attached
    jest.spyOn(mockEngine, 'on');

    redTeamSimulator = new RedTeamSimulator(mockEngine as unknown as SimulationEngineService);
    jest.clearAllMocks();
  });

  it('should initialize successfully', () => {
    // Re-initialize to capture constructor calls
    mockEngine = new MockSimulationEngineService();
    jest.spyOn(mockEngine, 'on');
    redTeamSimulator = new RedTeamSimulator(mockEngine as unknown as SimulationEngineService);

    expect(redTeamSimulator).toBeDefined();
    expect(mockEngine.on).toHaveBeenCalledWith('simulationCompleted', expect.any(Function));
    expect(mockEngine.on).toHaveBeenCalledWith('simulationFailed', expect.any(Function));
  });

  it('should run a phishing campaign successfully', async () => {
    const mockSimulationResult = { id: 'sim-123', status: 'INITIALIZING' };
    mockEngine.runSimulation.mockResolvedValue(mockSimulationResult);

    const eventSpy = jest.spyOn(eventBus, 'emit');

    const result = await redTeamSimulator.runCampaign('PHISHING_CAMPAIGN', 'target-org-1');

    expect(result).toHaveProperty('campaignId');
    expect(result.simulationId).toBe('sim-123');

    // Verify engine was called with correct config for phishing
    expect(mockEngine.runSimulation).toHaveBeenCalledWith(expect.objectContaining({
      name: 'PHISHING_CAMPAIGN against target-org-1',
      scenario: 'SOCIO_COGNITIVE',
      engines: expect.arrayContaining(['NETWORK_PROPAGATION']),
      parameters: expect.objectContaining({
        propagationRate: 0.4
      })
    }));

    // Verify event emission
    expect(eventSpy).toHaveBeenCalledWith('red-team:campaign-started', expect.objectContaining({
      simulationId: 'sim-123',
      type: 'PHISHING_CAMPAIGN'
    }));
  });

  it('should run a network breach campaign successfully', async () => {
    const mockSimulationResult = { id: 'sim-456', status: 'INITIALIZING' };
    mockEngine.runSimulation.mockResolvedValue(mockSimulationResult);

    await redTeamSimulator.runCampaign('NETWORK_BREACH', 'target-org-2');

    // Verify engine was called with correct config for breach
    expect(mockEngine.runSimulation).toHaveBeenCalledWith(expect.objectContaining({
      name: 'NETWORK_BREACH against target-org-2',
      scenario: 'CYBER_PHYSICAL',
      engines: expect.arrayContaining(['RISK_ASSESSMENT', 'EVENT_CASCADE']),
      parameters: expect.objectContaining({
        propagationRate: 0.6
      })
    }));
  });

  it('should throw error for unknown campaign type', async () => {
    await expect(redTeamSimulator.runCampaign('UNKNOWN_TYPE' as any, 'target'))
      .rejects.toThrow('Unknown campaign type: UNKNOWN_TYPE');
  });

  it('should handle engine failure', async () => {
    mockEngine.runSimulation.mockRejectedValue(new Error('Engine failed'));

    await expect(redTeamSimulator.runCampaign('PHISHING_CAMPAIGN', 'target'))
      .rejects.toThrow('Engine failed');
  });

  it('should retrieve campaign status', async () => {
    const mockSimulationResult = { id: 'sim-123', status: 'RUNNING' };
    mockEngine.runSimulation.mockResolvedValue(mockSimulationResult);
    mockEngine.getSimulationStatus.mockReturnValue({ status: 'RUNNING', progress: 0.5 });

    const { campaignId } = await redTeamSimulator.runCampaign('PHISHING_CAMPAIGN', 'target');

    const status = redTeamSimulator.getCampaignStatus(campaignId);

    expect(mockEngine.getSimulationStatus).toHaveBeenCalledWith('sim-123');
    expect(status).toEqual({ status: 'RUNNING', progress: 0.5 });
  });
});
