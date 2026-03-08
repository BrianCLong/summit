"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const behavioralDnaNetwork_js_1 = require("../src/ai/behavioralDnaNetwork.js");
const globals_1 = require("@jest/globals");
(0, globals_1.describe)('BehavioralDnaNetwork', () => {
    (0, globals_1.test)('updates embeddings and detects anomalies', () => {
        const network = new behavioralDnaNetwork_js_1.BehavioralDnaNetwork();
        network.ingest({ entityId: 'u1', vector: [1, 0] });
        network.ingest({ entityId: 'u1', vector: [1, 0] });
        const result = network.ingest({ entityId: 'u1', vector: [0, 1] });
        (0, globals_1.expect)(result.isAnomaly).toBe(true);
        const embedding = network.getEmbedding('u1');
        (0, globals_1.expect)(embedding).toBeDefined();
    });
    (0, globals_1.test)('predicts next behavior based on trend', () => {
        const network = new behavioralDnaNetwork_js_1.BehavioralDnaNetwork();
        network.ingest({ entityId: 'u2', vector: [1, 0] });
        network.ingest({ entityId: 'u2', vector: [0, 1] });
        const prediction = network.predictNext('u2');
        (0, globals_1.expect)(prediction).toEqual([-1, 2]);
    });
});
