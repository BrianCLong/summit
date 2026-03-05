import Fastify from 'fastify';
import { v4 as uuidv4 } from 'uuid';

export async function buildApp() {
  const fastify = Fastify({
    logger: false
  });

  fastify.post('/orchestrate', async (request, reply) => {
    const runRequest = request.body as any;

    const isAllowed = runRequest.payload.type === 'alert_triage';

    if (!isAllowed) {
      return reply.status(403).send({
        error: 'Policy Denied',
        reason: 'Workflow type not allowed'
      });
    }

    const runId = runRequest.run_id || uuidv4();
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
