import { randomUUID, createHmac, timingSafeEqual } from 'crypto';
import { pg } from '../../db/pg.js';
import { InboundAlertConfig, InboundAlert } from './types.js';
import { IncidentService } from '../../services/IncidentService.js'; // Hypothetical service

export class InboundAlertService {
  async processAlert(
    tenantId: string,
    configId: string,
    payload: any,
    signature: string
  ): Promise<InboundAlert> {

    // 1. Fetch Config
    const config = await pg.oneOrNone(
        `SELECT * FROM inbound_alert_configs WHERE id = $1 AND tenant_id = $2`,
        [configId, tenantId]
    );

    if (!config || !config.enabled) {
        throw new Error('Invalid or disabled alert configuration');
    }

    // 2. Verify Signature using HMAC-SHA256 with timing-safe comparison
    if (config.secret) {
        const hmac = createHmac('sha256', config.secret);
        hmac.update(JSON.stringify(payload));
        const digest = hmac.digest();
        const signatureBuffer = Buffer.from(signature, 'hex');

        if (digest.length !== signatureBuffer.length || !timingSafeEqual(digest, signatureBuffer)) {
            // Log potential attack
            throw new Error('Invalid signature');
        }
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
    const incident = await IncidentService.create(incidentData);
    const incidentId = incident.id;

    // 4. Log Alert
    const alert: InboundAlert = {
        id: randomUUID(),
        tenant_id: tenantId,
        config_id: configId,
        received_at: new Date(),
        payload,
        status: 'processed',
        incident_id: incidentId
    };

    await pg.write(
        `INSERT INTO inbound_alerts (id, tenant_id, config_id, received_at, payload, status, incident_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [alert.id, alert.tenant_id, alert.config_id, alert.received_at, alert.payload, alert.status, alert.incident_id]
    );

    return alert;
  }
}
