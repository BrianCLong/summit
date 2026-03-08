"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InboundAlertService = void 0;
const crypto_1 = require("crypto");
const pg_js_1 = require("../../db/pg.js");
const IncidentService_js_1 = require("../../services/IncidentService.js"); // Hypothetical service
class InboundAlertService {
    async processAlert(tenantId, configId, payload, signature) {
        // 1. Fetch Config
        const config = await pg_js_1.pg.oneOrNone(`SELECT * FROM inbound_alert_configs WHERE id = $1 AND tenant_id = $2`, [configId, tenantId]);
        if (!config || !config.enabled) {
            throw new Error('Invalid or disabled alert configuration');
        }
        // 2. Verify Signature (simplified)
        // In production, we'd use HMAC with config.secret
        if (config.secret && signature !== config.secret) {
            // Log potential attack
            throw new Error('Invalid signature');
        }
        // 3. Create Incident
        // Map payload to incident structure
        const incidentData = {
            title: payload.title || payload.summary || 'Inbound Alert',
            description: JSON.stringify(payload),
            severity: payload.severity || 'medium',
            source: config.source_type,
            tenant_id: tenantId
        };
        // Assuming IncidentService exists and has create method
        const incident = await IncidentService_js_1.IncidentService.create(incidentData);
        const incidentId = incident.id;
        // 4. Log Alert
        const alert = {
            id: (0, crypto_1.randomUUID)(),
            tenant_id: tenantId,
            config_id: configId,
            received_at: new Date(),
            payload,
            status: 'processed',
            incident_id: incidentId
        };
        await pg_js_1.pg.write(`INSERT INTO inbound_alerts (id, tenant_id, config_id, received_at, payload, status, incident_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`, [alert.id, alert.tenant_id, alert.config_id, alert.received_at, alert.payload, alert.status, alert.incident_id]);
        return alert;
    }
}
exports.InboundAlertService = InboundAlertService;
