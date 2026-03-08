"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const router_1 = require("./router");
const zod_1 = require("zod");
// Example Route: Dispatch Action
const dispatchActionRoute = (0, router_1.defineRoute)({
    id: 'agent.dispatch',
    description: 'Dispatch an action to an agent',
    source: 'client',
    targetService: 'agent-gateway',
    inputSchema: zod_1.z.object({
        agentId: zod_1.z.string(),
        action: zod_1.z.string(),
        params: zod_1.z.record(zod_1.z.any()).optional(),
    }),
    outputSchema: zod_1.z.object({
        status: zod_1.z.string(),
        result: zod_1.z.any().optional(),
    }),
    handler: async (payload, context) => {
        // Simulate downstream call
        console.log(`[${context.requestId}] Dispatching to agent ${payload.agentId}`, payload);
        // Here we would call the actual agent-gateway or NATS
        // For now, we simulate a success
        await new Promise(resolve => setTimeout(resolve, 100)); // Simulate latency
        return {
            status: 'queued',
            result: {
                jobId: crypto.randomUUID()
            }
        };
    },
});
router_1.router.register(dispatchActionRoute);
