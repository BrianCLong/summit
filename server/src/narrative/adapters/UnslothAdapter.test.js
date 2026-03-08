"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const UnslothAdapter_js_1 = require("./UnslothAdapter.js");
// Mock global fetch
global.fetch = globals_1.jest.fn();
(0, globals_1.describe)('UnslothAdapter', () => {
    let adapter;
    const config = {
        baseUrl: 'http://localhost:8000/v1',
        model: 'unsloth/llama-3-8b-instruct',
        apiKey: 'test-key'
    };
    const mockState = {
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
    const mockEvents = [
        {
            id: 'evt-1',
            type: 'social',
            theme: 'conflict',
            intensity: 0.9,
            description: 'A major protest occurred.',
            scheduledTick: 10
        }
    ];
    (0, globals_1.beforeEach)(() => {
        globals_1.jest.clearAllMocks();
        adapter = new UnslothAdapter_js_1.UnslothAdapter(config);
    });
    (0, globals_1.it)('should construct a prompt with full history and call the inference server', async () => {
        const mockResponse = {
            choices: [
                { message: { content: 'Summary: Chaos ensues.\nRisks: High.\nOpportunities: None.' } }
            ]
        };
        global.fetch.mockResolvedValue({
            ok: true,
            json: async () => mockResponse
        });
        const result = await adapter.generateNarrative({
            state: mockState,
            recentEvents: mockEvents
        });
        (0, globals_1.expect)(result).toContain('Chaos ensues');
        (0, globals_1.expect)(global.fetch).toHaveBeenCalledWith('http://localhost:8000/v1/chat/completions', globals_1.expect.objectContaining({
            method: 'POST',
            headers: globals_1.expect.objectContaining({
                'Authorization': 'Bearer test-key',
                'Content-Type': 'application/json'
            }),
            body: globals_1.expect.stringContaining('"model":"unsloth/llama-3-8b-instruct"')
        }));
        const callArgs = global.fetch.mock.calls[0];
        const body = JSON.parse(callArgs[1]?.body);
        // Verify prompt contains history (length check or specific content)
        const userPrompt = body.messages[1].content;
        (0, globals_1.expect)(userPrompt).toContain('Test Sim');
        (0, globals_1.expect)(userPrompt).toContain('Faction A');
        (0, globals_1.expect)(userPrompt).toContain('A major protest occurred');
    });
    (0, globals_1.it)('should handle API errors gracefully', async () => {
        global.fetch.mockResolvedValue({
            ok: false,
            status: 500,
            text: async () => 'Internal Server Error'
        });
        await (0, globals_1.expect)(adapter.generateNarrative({
            state: mockState,
            recentEvents: mockEvents
        })).rejects.toThrow('Unsloth Adapter Error (500): Internal Server Error');
    });
});
