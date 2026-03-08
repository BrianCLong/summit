"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const supertest_1 = __importDefault(require("supertest"));
const narrative_sim_js_1 = __importDefault(require("../../routes/narrative-sim.js"));
const globals_1 = require("@jest/globals");
const NO_NETWORK_LISTEN = process.env.NO_NETWORK_LISTEN === 'true';
const describeIf = NO_NETWORK_LISTEN ? globals_1.describe.skip : globals_1.describe;
describeIf('Narrative simulation routes', () => {
    const app = (0, express_1.default)()
        .use(express_1.default.json())
        .use('/api', narrative_sim_js_1.default);
    const basePayload = {
        name: 'City crisis drill',
        themes: ['stability', 'public sentiment'],
        tickIntervalMinutes: 30,
        initialEntities: [
            {
                name: 'City leadership',
                type: 'actor',
                alignment: 'ally',
                influence: 0.7,
                sentiment: 0.1,
                volatility: 0.3,
                resilience: 0.6,
                themes: { stability: 0.8, 'public sentiment': 0.5 },
                relationships: [],
            },
            {
                name: 'Civic coalition',
                type: 'group',
                alignment: 'neutral',
                influence: 0.5,
                sentiment: -0.2,
                volatility: 0.4,
                resilience: 0.5,
                themes: { stability: 0.6, 'public sentiment': 0.7 },
                relationships: [],
            },
        ],
        initialParameters: [{ name: 'public_trust', value: 0.45 }],
    };
    (0, globals_1.it)('creates simulations, accepts events, and advances time', async () => {
        const createResponse = await (0, supertest_1.default)(app)
            .post('/api/simulations')
            .send(basePayload)
            .expect(201);
        const simulationId = createResponse.body.id;
        (0, globals_1.expect)(simulationId).toBeDefined();
        const entityKeys = Object.keys(createResponse.body.entities ?? {});
        const actorId = entityKeys[0];
        const targetId = entityKeys[1];
        await (0, supertest_1.default)(app)
            .post(`/api/simulations/${simulationId}/events`)
            .send({
            type: 'social',
            actorId,
            targetIds: targetId ? [targetId] : [],
            theme: 'stability',
            intensity: 1,
            sentimentShift: 0.2,
            influenceShift: 0.05,
            description: 'Community briefing received strong support',
            scheduledTick: 1,
        })
            .expect(202);
        const tickResponse = await (0, supertest_1.default)(app)
            .post(`/api/simulations/${simulationId}/tick`)
            .send({ steps: 1 })
            .expect(200);
        (0, globals_1.expect)(tickResponse.body.tick).toBe(1);
        (0, globals_1.expect)(Array.isArray(tickResponse.body.recentEvents)).toBe(true);
        const stateResponse = await (0, supertest_1.default)(app)
            .get(`/api/simulations/${simulationId}`)
            .expect(200);
        (0, globals_1.expect)(stateResponse.body.tick).toBe(1);
        (0, globals_1.expect)(stateResponse.body.arcs.length).toBeGreaterThan(0);
    });
    (0, globals_1.it)('supports LLM-driven configuration via API', async () => {
        const response = await (0, supertest_1.default)(app)
            .post('/api/simulations')
            .send({
            ...basePayload,
            name: 'Election pulse',
            generatorMode: 'llm',
            llm: { adapter: 'echo', promptTemplate: 'Tick {tick}: {events}' },
        })
            .expect(201);
        const simulationId = response.body.id;
        const tickResponse = await (0, supertest_1.default)(app)
            .post(`/api/simulations/${simulationId}/tick`)
            .send({ steps: 1 })
            .expect(200);
        (0, globals_1.expect)(tickResponse.body.narrative.mode).toBe('llm');
        (0, globals_1.expect)(typeof tickResponse.body.narrative.summary).toBe('string');
        const listResponse = await (0, supertest_1.default)(app).get('/api/simulations').expect(200);
        (0, globals_1.expect)(listResponse.body.length).toBeGreaterThan(0);
    });
});
