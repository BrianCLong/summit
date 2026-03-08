"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const supertest_1 = __importDefault(require("supertest"));
const describeIf = process.env.NO_NETWORK_LISTEN === 'true' ? globals_1.describe.skip : globals_1.describe;
describeIf('Edge Assurance Operations', () => {
    let app;
    let edgeFleetService;
    let createApp;
    (0, globals_1.beforeAll)(async () => {
        ({ createApp } = await Promise.resolve().then(() => __importStar(require('../src/app.js'))));
        ({ edgeFleetService } = await Promise.resolve().then(() => __importStar(require('../src/services/EdgeFleetService.js'))));
        app = await createApp();
    });
    const agentManifest = {
        agentId: 'agent-007',
        version: '1.0.0',
        slsaLevel: 3,
        signature: 'valid-sig-123',
        capabilities: ['INFLUENCE_MAPPING']
    };
    const missionContext = {
        missionId: 'mission-alpha',
        type: 'INFLUENCE_MAPPING',
        target: 'region-x',
        authorizedBy: 'commander-shepard'
    };
    (0, globals_1.it)('should register an agent with valid SLSA', async () => {
        const res = await (0, supertest_1.default)(app)
            .post('/api/edge/agents')
            .send(agentManifest);
        (0, globals_1.expect)(res.status).toBe(201);
        (0, globals_1.expect)(res.body.success).toBe(true);
    });
    (0, globals_1.it)('should create and deploy a fleet in DENIED environment', async () => {
        // 1. Create Fleet
        const createRes = await (0, supertest_1.default)(app)
            .post('/api/edge/fleets')
            .send({
            agentIds: ['agent-007'],
            environment: 'DENIED'
        });
        (0, globals_1.expect)(createRes.status).toBe(201);
        const fleetId = createRes.body.fleetId;
        (0, globals_1.expect)(fleetId).toBeDefined();
        // 2. Deploy Fleet
        const deployRes = await (0, supertest_1.default)(app)
            .post(`/api/edge/fleets/${fleetId}/deploy`)
            .send({ missionContext });
        (0, globals_1.expect)(deployRes.status).toBe(200);
        // 3. Record Activity (Buffered)
        const activityRes = await (0, supertest_1.default)(app)
            .post(`/api/edge/fleets/${fleetId}/activity`)
            .send({
            type: 'OUTPUT',
            content: 'Mapping influence nodes in sector 7'
        });
        (0, globals_1.expect)(activityRes.status).toBe(200);
        // Verify buffering
        const fleet = edgeFleetService.getFleet(fleetId);
        (0, globals_1.expect)(fleet?.logsBuffer.length).toBe(1);
        // 4. Sync Logs
        const syncRes = await (0, supertest_1.default)(app)
            .post(`/api/edge/fleets/${fleetId}/sync`);
        (0, globals_1.expect)(syncRes.status).toBe(200);
        (0, globals_1.expect)(syncRes.body.syncedCount).toBe(1);
        // Verify buffer cleared
        (0, globals_1.expect)(fleet?.logsBuffer.length).toBe(0);
    });
});
