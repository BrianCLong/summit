"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const routes_js_1 = require("../src/api/routes.js");
const SimulationEngine_js_1 = require("../src/core/SimulationEngine.js");
const config = {
    initialTimestamp: 0,
    actors: [
        {
            id: 'planner',
            name: 'Planner Poe',
            mood: 4,
            resilience: 0.4,
            influence: 1.5,
        },
        {
            id: 'respond',
            name: 'Responder Rae',
            mood: 2,
            resilience: 0.3,
            influence: 1.2,
        },
    ],
    relationships: [
        { sourceId: 'planner', targetId: 'respond', type: 'ally', intensity: 0.7 },
    ],
};
const crisisEvent = {
    id: 'api-crisis',
    type: 'crisis',
    actorId: 'planner',
    intensity: 1.2,
    timestamp: 1,
};
describe('Narrative API integration', () => {
    it('initializes, steps, and injects events via API', async () => {
        const engine = new SimulationEngine_js_1.SimulationEngine();
        const app = (0, express_1.default)();
        app.use(express_1.default.json());
        app.use((0, routes_js_1.createNarrativeRouter)(engine));
        const server = await new Promise((resolve) => {
            const listener = app.listen(0, () => resolve(listener));
        });
        const { port } = server.address();
        const baseUrl = `http://127.0.0.1:${port}`;
        try {
            const initResponse = await fetch(`${baseUrl}/api/narrative/init`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(config),
            });
            expect(initResponse.status).toBe(200);
            const injectResponse = await fetch(`${baseUrl}/api/narrative/inject-event`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(crisisEvent),
            });
            expect(injectResponse.status).toBe(202);
            const stepResponse = await fetch(`${baseUrl}/api/narrative/step`, {
                method: 'POST',
            });
            expect(stepResponse.status).toBe(200);
            const stateResponse = await fetch(`${baseUrl}/api/narrative/state`);
            expect(stateResponse.status).toBe(200);
            const payload = (await stateResponse.json());
            expect(payload.timestamp).toBe(1);
            expect(payload.events).toHaveLength(1);
            const planner = payload.actors.find((actor) => actor.id === 'planner');
            expect(planner?.mood).toBeLessThan(4);
        }
        finally {
            await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
        }
    });
});
