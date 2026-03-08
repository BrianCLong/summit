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
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const mockQuery = globals_1.jest.fn();
globals_1.jest.mock('../../src/config/database.js', () => ({
    getPostgresPool: () => ({
        query: mockQuery,
    }),
}));
const queryMock = mockQuery;
describe('Governance & Control Plane Flow', () => {
    let agentRegistry;
    let agentControlPlane;
    let agentROITracker;
    beforeAll(async () => {
        const registryModule = await Promise.resolve().then(() => __importStar(require('../../src/governance/agent-registry.js')));
        agentRegistry = registryModule.agentRegistry;
        const cpModule = await Promise.resolve().then(() => __importStar(require('../../src/maestro/control-plane.js')));
        agentControlPlane = cpModule.agentControlPlane;
        const roiModule = await Promise.resolve().then(() => __importStar(require('../../src/maestro/roi-tracker.js')));
        agentROITracker = roiModule.agentROITracker;
    });
    beforeEach(() => {
        queryMock.mockReset();
    });
    it('should create an agent', async () => {
        queryMock.mockResolvedValueOnce({
            rows: [{
                    id: 'agent-123',
                    tenant_id: 'tenant-1',
                    name: 'DevAgent',
                    status: 'DRAFT',
                    created_at: new Date(),
                    updated_at: new Date()
                }]
        });
        const agent = await agentRegistry.createAgent({
            name: 'DevAgent',
            tenantId: 'tenant-1'
        });
        expect(agent.id).toBe('agent-123');
        expect(queryMock).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO agents'), expect.any(Array));
    });
    it('should verify agent action (allow default)', async () => {
        queryMock.mockResolvedValueOnce({ rows: [] });
        const result = await agentControlPlane.verifyAgentAction('agent-123', 'deploy', {});
        expect(result.allowed).toBe(true);
    });
    it('should block agent action if policy fails', async () => {
        queryMock.mockResolvedValueOnce({
            rows: [{
                    id: 'policy-1',
                    agent_id: 'agent-123',
                    name: 'Manual Approval',
                    policy_type: 'MANUAL_APPROVAL',
                    configuration: {},
                    is_blocking: true
                }]
        });
        const result = await agentControlPlane.verifyAgentAction('agent-123', 'deploy', {});
        expect(result.allowed).toBe(false);
        expect(result.reason).toContain('requires manual approval');
    });
    it('should record ROI metric', async () => {
        queryMock.mockResolvedValueOnce({
            rows: [{
                    id: 'metric-1',
                    agent_id: 'agent-123',
                    metric_type: 'TIME_SAVED',
                    value: 10,
                    recorded_at: new Date()
                }]
        });
        const metric = await agentROITracker.recordMetric('agent-123', 'TIME_SAVED', 10);
        expect(metric.value).toBe(10);
    });
});
