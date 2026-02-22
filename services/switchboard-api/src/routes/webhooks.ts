import { FastifyInstance } from 'fastify';
import { v4 as uuidv4 } from 'uuid';

export async function webhookRoutes(fastify: FastifyInstance) {
  fastify.post('/splunk', async (request, reply) => {
    const rawAlert = request.body as any;

    // Normalize Splunk alert to internal Alert schema
    const normalizedAlert = {
      id: rawAlert.sid || uuidv4(),
      source: 'splunk',
      severity: rawAlert.result?.severity || 'medium',
      title: rawAlert.search_name || 'Splunk Alert',
      raw: rawAlert
    };

    fastify.log.info({ alert: normalizedAlert }, 'Normalized Splunk alert');

    return {
      status: 'accepted',
      alert_id: normalizedAlert.id
    };
  });
}
