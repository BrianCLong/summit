import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createForecastAdapter } from '../adapters/forecastAdapter';
import { createWorldModelAdapter } from '../adapters/worldModelAdapter';
import { createNarrativeAdapter } from '../adapters/narrativeAdapter';
import { createMissionAdapter } from '../adapters/missionAdapter';
import { createAutonomyAdapter } from '../adapters/autonomyAdapter';
import { createGovernanceAdapter } from '../adapters/governanceAdapter';
import { createInsightAdapter } from '../adapters/insightAdapter';

const BASE_URL = 'http://localhost:4001';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock WebSocket
const mockWs = { onmessage: null as any, close: vi.fn() };
global.WebSocket = vi.fn(() => mockWs) as any;

beforeEach(() => {
  vi.clearAllMocks();
});

describe('Forecast Adapter', () => {
  const adapter = createForecastAdapter(BASE_URL);

  it('fetches forecasts', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve([]) });
    const result = await adapter.getForecasts();
    expect(result).toEqual([]);
    expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('/api/v1/forecasts'));
  });

  it('throws on fetch failure', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 500 });
    await expect(adapter.getForecasts()).rejects.toThrow('Failed to fetch forecasts');
  });

  it('subscribes to forecast updates', () => {
    const callback = vi.fn();
    const unsub = adapter.subscribeTo('forecast-1', callback);
    expect(WebSocket).toHaveBeenCalledWith(expect.stringContaining('/api/v1/forecasts/forecast-1/stream'));
    unsub();
    expect(mockWs.close).toHaveBeenCalled();
  });
});

describe('World Model Adapter', () => {
  const adapter = createWorldModelAdapter(BASE_URL);

  it('fetches current state', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({}) });
    await adapter.getCurrentState();
    expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('/api/v1/world-state/current'));
  });
});

describe('Narrative Adapter', () => {
  const adapter = createNarrativeAdapter(BASE_URL);

  it('fetches clusters with filters', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve([]) });
    await adapter.getClusters({ stance: ['adversarial'] });
    expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('stance=adversarial'));
  });
});

describe('Mission Adapter', () => {
  const adapter = createMissionAdapter(BASE_URL);

  it('fetches missions', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve([]) });
    await adapter.getMissions();
    expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('/api/v1/missions'));
  });

  it('updates mission state', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({}) });
    await adapter.updateMissionState('m-1', 'critical');
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/missions/m-1/state'),
      expect.objectContaining({ method: 'PATCH' })
    );
  });
});

describe('Autonomy Adapter', () => {
  const adapter = createAutonomyAdapter(BASE_URL);

  it('approves agent action', async () => {
    mockFetch.mockResolvedValue({ ok: true });
    await adapter.approveAction('agent-1', 'action-1');
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/agents/agent-1/approve'),
      expect.objectContaining({ method: 'POST' })
    );
  });
});

describe('Governance Adapter', () => {
  const adapter = createGovernanceAdapter(BASE_URL);

  it('fetches gates', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve([]) });
    await adapter.getGates();
    expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('/api/v1/governance/gates'));
  });
});

describe('Insight Adapter', () => {
  const adapter = createInsightAdapter(BASE_URL);

  it('triages insight', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({}) });
    await adapter.triageInsight('i-1', 'investigating', 'analyst-1');
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/insights/i-1/triage'),
      expect.objectContaining({ method: 'PATCH' })
    );
  });
});
