import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AgentLearningPipeline, DriftSignal } from '../src/learning/pipeline';

// Mock Redis
const mockRedis = {
  lpush: vi.fn(),
  ltrim: vi.fn(),
  expire: vi.fn(),
  lrange: vi.fn(),
  quit: vi.fn()
};

vi.mock('ioredis', () => {
  return {
    Redis: class {
      constructor() {
        return mockRedis;
      }
    }
  };
});

describe('AgentLearningPipeline', () => {
  let pipeline: AgentLearningPipeline;

  beforeEach(() => {
    vi.clearAllMocks();
    pipeline = new AgentLearningPipeline();
  });

  afterEach(async () => {
    if (pipeline) {
      await pipeline.close();
    }
  });

  it('should store drift signal in short-term memory', async () => {
    const signal: DriftSignal = {
      id: 'test-1',
      timestamp: Date.now(),
      entityId: 'e1',
      entityType: 'User',
      driftType: 'PermissionChange',
      severity: 'medium',
      details: {}
    };

    mockRedis.lrange.mockResolvedValue([]); // No previous events

    await pipeline.learn(signal);

    expect(mockRedis.lpush).toHaveBeenCalledWith('drift_buffer:User', JSON.stringify(signal));
    expect(mockRedis.expire).toHaveBeenCalled();
  });

  it('should detect spike in drift signals', async () => {
    const signal: DriftSignal = {
      id: 'test-2',
      timestamp: Date.now(),
      entityId: 'e1',
      entityType: 'User',
      driftType: 'PermissionChange',
      severity: 'medium',
      details: {}
    };

    // Simulate 6 previous events within 5 mins
    const recentEvents = Array(6).fill(signal).map(s => JSON.stringify(s));
    mockRedis.lrange.mockResolvedValue(recentEvents);

    const insight = await pipeline.learn(signal);

    expect(insight.source).toBe('short-term');
    expect(insight.confidence).toBe(0.95);
    expect(insight.pattern).toContain('Frequent PermissionChange');
  });
});
