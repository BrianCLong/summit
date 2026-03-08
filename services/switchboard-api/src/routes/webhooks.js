"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.webhookRoutes = webhookRoutes;
const uuid_1 = require("uuid");
async function webhookRoutes(fastify) {
    fastify.post('/splunk', async (request, reply) => {
        const rawAlert = request.body;
        // Normalize Splunk alert to internal Alert schema
        const normalizedAlert = {
            id: rawAlert.sid || (0, uuid_1.v4)(),
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
