"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildApp = buildApp;
const fastify_1 = __importDefault(require("fastify"));
const uuid_1 = require("uuid");
async function buildApp() {
    const fastify = (0, fastify_1.default)({
        logger: false
    });
    fastify.post('/orchestrate', async (request, reply) => {
        const runRequest = request.body;
        const isAllowed = runRequest.payload.type === 'alert_triage';
        if (!isAllowed) {
            return reply.status(403).send({
                error: 'Policy Denied',
                reason: 'Workflow type not allowed'
            });
        }
        const runId = runRequest.run_id || (0, uuid_1.v4)();
        const requiresHITL = runRequest.payload.constraints?.mode === 'autopilot';
        return {
            run_id: runId,
            status: 'orchestrating',
            requires_hitl: requiresHITL,
            steps: [
                { id: 's1', tool: 'connector.splunk.fetch', status: 'pending' },
                { id: 's2', tool: 'intelgraph.enrich', status: 'pending' }
            ]
        };
    });
    fastify.get('/healthz', async () => {
        return { status: 'ok' };
    });
    return fastify;
}
