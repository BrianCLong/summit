"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.certificationRegistry = exports.CertificationRegistry = void 0;
const logger_js_1 = require("../config/logger.js");
const postgres_js_1 = require("../db/postgres.js");
/**
 * Registry for Ecosystem Partnership Certification (Task #105).
 */
class CertificationRegistry {
    static instance;
    constructor() { }
    static getInstance() {
        if (!CertificationRegistry.instance) {
            CertificationRegistry.instance = new CertificationRegistry();
        }
        return CertificationRegistry.instance;
    }
    /**
     * Registers or updates a partner certification.
     */
    async registerPartner(partner) {
        const pool = (0, postgres_js_1.getPostgresPool)();
        await pool.query(`INSERT INTO partner_certifications (partner_id, name, tier, status, metadata, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       ON CONFLICT (partner_id) DO UPDATE SET 
         status = $4, 
         metadata = $5, 
         updated_at = NOW()`, [partner.partnerId, partner.name, partner.tier, partner.status, JSON.stringify(partner.metadata)]);
        logger_js_1.logger.info({ partnerId: partner.partnerId, status: partner.status }, 'Partner certification recorded');
    }
    /**
     * Checks if a partner is currently certified.
     */
    async isCertified(partnerId) {
        const pool = (0, postgres_js_1.getPostgresPool)();
        const result = await pool.query("SELECT status FROM partner_certifications WHERE partner_id = $1 AND status = 'CERTIFIED'", [partnerId]);
        return result.rows.length > 0;
    }
}
exports.CertificationRegistry = CertificationRegistry;
exports.certificationRegistry = CertificationRegistry.getInstance();
