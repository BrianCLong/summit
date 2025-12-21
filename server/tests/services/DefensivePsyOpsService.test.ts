import { DefensivePsyOpsService } from '../../src/services/DefensivePsyOpsService';
import { EventEmitter } from 'events';
import { createRequire } from 'module';
import { describe, it, expect, jest, afterEach, beforeEach } from '@jest/globals';

// Mock dependencies
const mockQuery = jest.fn();
const mockClient = {
  query: mockQuery,
  release: jest.fn(),
};
const mockPool = {
  connect: jest.fn().mockResolvedValue(mockClient),
  query: mockQuery,
};

jest.mock('../../src/config/database', () => ({
  getPostgresPool: jest.fn(() => mockPool),
}));

// Mock EventBus
const require = createRequire(import.meta.url);
const eventBus = require('../../src/workers/eventBus.js') as EventEmitter;

describe('DefensivePsyOpsService', () => {
  let service: DefensivePsyOpsService;

  beforeEach(() => {
    jest.clearAllMocks();
    // Re-instantiate service to reset listeners/state if any
    service = new DefensivePsyOpsService();
  });

  afterEach(() => {
    eventBus.removeAllListeners();
  });

  it('should detect threats in content', async () => {
    // Mock DB insert response
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          id: 'threat-123',
          threat_level: 'HIGH',
          status: 'MONITORING',
        },
      ],
    });

    const content = "This is urgent! They don't want you to know the truth!";
    const threat = await service.detectPsychologicalThreats(content, {
      source: 'TEST',
    });

    expect(threat).toBeDefined();
    expect(threat?.id).toBe('threat-123');
    // Expect query to have been called for insert
    expect(mockQuery).toHaveBeenCalled();
  });

  it('should not detect threats in safe content', async () => {
    const content = 'The weather is nice today and we verified the data.';
    const threat = await service.detectPsychologicalThreats(content, {
      source: 'TEST',
    });

    expect(threat).toBeNull();
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('should process events from Red Team', async () => {
    // Mock DB insert response
    mockQuery.mockResolvedValue({
      rows: [{ id: 'threat-sim', threat_level: 'HIGH' }],
    });

    const payload = {
      narrative: 'Shocking exposed secrets! Urgent!',
      virality: 0.9,
    };

    // Emit event
    eventBus.emit('raw-event', {
      source: 'red-team',
      type: 'influence',
      data: payload,
    });

    // Wait for async processing
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(mockQuery).toHaveBeenCalled();
  });
});
