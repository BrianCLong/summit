import { router, defineRoute } from './router';
import { z } from 'zod';

// Example Route: Dispatch Action
const dispatchActionRoute = defineRoute({
  id: 'agent.dispatch',
  description: 'Dispatch an action to an agent',
  source: 'client',
  targetService: 'agent-gateway',
  inputSchema: z.object({
    agentId: z.string(),
    action: z.string(),
    params: z.record(z.any()).optional(),
  }),
  outputSchema: z.object({
    status: z.string(),
    result: z.any().optional(),
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

router.register(dispatchActionRoute);
