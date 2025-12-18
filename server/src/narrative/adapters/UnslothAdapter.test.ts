import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { UnslothAdapter } from './UnslothAdapter.js';
import type { NarrativeState, NarrativeEvent } from '../types.js';

// Mock global fetch
global.fetch = jest.fn() as unknown as typeof fetch;

describe('UnslothAdapter', () => {
  let adapter: UnslothAdapter;
  const config = {
    baseUrl: 'http://localhost:8000/v1',
    model: 'unsloth/llama-3-8b-instruct',
    apiKey: 'test-key'
  };

  const mockState: NarrativeState = {
    id: 'sim-1',
    name: 'Test Sim',
    tick: 10,
    startedAt: new Date(),
    timestamp: new Date(),
    tickIntervalMinutes: 60,
    themes: ['conflict'],
    entities: {
      'e1': {
        id: 'e1',
        name: 'Faction A',
        type: 'group',
        alignment: 'neutral',
        influence: 0.8,
        sentiment: -0.5,
        volatility: 0.1,
        resilience: 0.5,
        themes: {},
        relationships: [],
        pressure: 0.2,
        trend: 'falling',
        lastUpdatedTick: 9,
        history: Array(10).fill({ tick: 0, sentiment: 0, influence: 0 }) // Simulating long history
      }
    },
    parameters: {},
    arcs: [],
    recentEvents: [],
    narrative: {
      mode: 'rule-based',
      summary: 'Test summary',
      highlights: [],
      risks: [],
      opportunities: []
    }
  };

  const mockEvents: NarrativeEvent[] = [
    {
      id: 'evt-1',
      type: 'social',
      theme: 'conflict',
      intensity: 0.9,
      description: 'A major protest occurred.',
      scheduledTick: 10
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    adapter = new UnslothAdapter(config);
  });

  it('should construct a prompt with full history and call the inference server', async () => {
    const mockResponse = {
      choices: [
        { message: { content: 'Summary: Chaos ensues.\nRisks: High.\nOpportunities: None.' } }
      ]
    };

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockResponse
    } as Response);

    const result = await adapter.generateNarrative({
      state: mockState,
      recentEvents: mockEvents
    });

    expect(result).toContain('Chaos ensues');

    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:8000/v1/chat/completions',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Authorization': 'Bearer test-key',
          'Content-Type': 'application/json'
        }),
        body: expect.stringContaining('"model":"unsloth/llama-3-8b-instruct"')
      })
    );

    const callArgs = (global.fetch as jest.Mock).mock.calls[0];
    const body = JSON.parse(callArgs[1].body as string);

    // Verify prompt contains history (length check or specific content)
    const userPrompt = body.messages[1].content;
    expect(userPrompt).toContain('Test Sim');
    expect(userPrompt).toContain('Faction A');
    expect(userPrompt).toContain('A major protest occurred');
  });

  it('should handle API errors gracefully', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => 'Internal Server Error'
    } as Response);

    await expect(adapter.generateNarrative({
      state: mockState,
      recentEvents: mockEvents
    })).rejects.toThrow('Unsloth Adapter Error (500): Internal Server Error');
  });
});
