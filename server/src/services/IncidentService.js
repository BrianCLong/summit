"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IncidentService = void 0;
const crypto_1 = require("crypto");
const pg_js_1 = require("../db/pg.js");
class IncidentService {
    static async create(data) {
        const id = (0, crypto_1.randomUUID)();
        const incident = await pg_js_1.pg.oneOrNone(`INSERT INTO incidents (
        id, tenant_id, title, description, severity, source, status
      ) VALUES ($1, $2, $3, $4, $5, $6, 'open')
      RETURNING *`, [
            id,
            data.tenant_id,
            data.title,
            data.description || '',
            data.severity,
            data.source,
        ], { tenantId: data.tenant_id });
        if (!incident) {
            throw new Error('Failed to create incident');
        }
        return incident;
    }
    static async get(tenantId, id) {
        return pg_js_1.pg.oneOrNone(`SELECT * FROM incidents WHERE id = $1 AND tenant_id = $2`, [id, tenantId], { tenantId });
    }
    static async updateTicketRef(tenantId, id, ticketRef) {
        return pg_js_1.pg.oneOrNone(`UPDATE incidents SET ticket_ref = $1, updated_at = NOW()
         WHERE id = $2 AND tenant_id = $3 RETURNING *`, [ticketRef, id, tenantId], { tenantId });
    }
}
exports.IncidentService = IncidentService;
