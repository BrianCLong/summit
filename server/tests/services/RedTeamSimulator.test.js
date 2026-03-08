"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const RedTeamSimulator_1 = require("../../src/services/RedTeamSimulator");
const events_1 = require("events");
const globals_1 = require("@jest/globals");
const event_bus_js_1 = require("../../src/lib/events/event-bus.js");
(0, globals_1.describe)('RedTeamSimulator', () => {
    (0, globals_1.afterEach)(() => {
        event_bus_js_1.eventBus.removeAllListeners();
    });
    (0, globals_1.it)('should run a phishing campaign and emit an event', (done) => {
        const simulationEngine = new events_1.EventEmitter();
        simulationEngine.runSimulation = globals_1.jest.fn().mockResolvedValue({ id: 'sim-1' });
        const simulator = new RedTeamSimulator_1.RedTeamSimulator(simulationEngine);
        event_bus_js_1.eventBus.once('raw-event', (event) => {
            try {
                (0, globals_1.expect)(event.source).toBe('red-team');
                (0, globals_1.expect)(event.data.type).toBe('PHISHING_CAMPAIGN');
                (0, globals_1.expect)(event.data.entity).toBe('CorpX');
                done();
            }
            catch (e) {
                done(e);
            }
        });
        simulator.runCampaign('PHISHING_CAMPAIGN', 'CorpX').catch(done);
    });
    (0, globals_1.it)('should emit a completion update when a simulation finishes', (done) => {
        const simulationEngine = new events_1.EventEmitter();
        simulationEngine.runSimulation = globals_1.jest.fn().mockResolvedValue({ id: 'sim-2' });
        const simulator = new RedTeamSimulator_1.RedTeamSimulator(simulationEngine);
        event_bus_js_1.eventBus.once('red-team:campaign-update', (event) => {
            try {
                (0, globals_1.expect)(event.status).toBe('COMPLETED');
                (0, globals_1.expect)(event.simulationId).toBe('sim-2');
                done();
            }
            catch (e) {
                done(e);
            }
        });
        simulator.runCampaign('PHISHING_CAMPAIGN', 'CorpY').then(() => {
            simulationEngine.emit('simulationCompleted', { id: 'sim-2', results: {} });
        }).catch(done);
    });
});
