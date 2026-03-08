"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.factGovRepo = void 0;
const database_js_1 = require("../../config/database.js");
const pool = (0, database_js_1.getPostgresPool)();
exports.factGovRepo = {
    async createAgency(name, domain) {
        const res = await pool.query('INSERT INTO factgov_agencies (name, domain) VALUES ($1, $2) RETURNING *', [name, domain]);
        return camelCaseKeys(res.rows[0]);
    },
    async createVendor(name, tags, description) {
        const res = await pool.query('INSERT INTO factgov_vendors (name, tags, description) VALUES ($1, $2, $3) RETURNING *', [name, tags, description]);
        return camelCaseKeys(res.rows[0]);
    },
    async getVendor(id) {
        const res = await pool.query('SELECT * FROM factgov_vendors WHERE id = $1', [id]);
        return res.rows.length ? camelCaseKeys(res.rows[0]) : null;
    },
    async findVendorsByTags(tags) {
        const res = await pool.query('SELECT * FROM factgov_vendors WHERE tags && $1', [tags]);
        return res.rows.map(camelCaseKeys);
    },
    async createRfp(agencyId, title, content) {
        const res = await pool.query('INSERT INTO factgov_rfps (agency_id, title, content) VALUES ($1, $2, $3) RETURNING *', [agencyId, title, content]);
        return camelCaseKeys(res.rows[0]);
    },
    async getRfp(id) {
        const res = await pool.query('SELECT * FROM factgov_rfps WHERE id = $1', [id]);
        return res.rows.length ? camelCaseKeys(res.rows[0]) : null;
    },
    async createMatch(rfpId, vendorId, score) {
        const res = await pool.query('INSERT INTO factgov_matches (rfp_id, vendor_id, score) VALUES ($1, $2, $3) RETURNING *', [rfpId, vendorId, score]);
        return camelCaseKeys(res.rows[0]);
    },
    async getMatchesForRfp(rfpId) {
        const res = await pool.query('SELECT * FROM factgov_matches WHERE rfp_id = $1 ORDER BY score DESC', [rfpId]);
        return res.rows.map(camelCaseKeys);
    },
    async createAudit(audit) {
        const res = await pool.query(`INSERT INTO factgov_audits (entity_type, entity_id, action, actor_id, details, previous_hash, hash)
           VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`, [audit.entityType, audit.entityId, audit.action, audit.actorId, JSON.stringify(audit.details), audit.previousHash, audit.hash]);
        return camelCaseKeys(res.rows[0]);
    },
    async getLatestAudit(entityId) {
        const res = await pool.query('SELECT * FROM factgov_audits WHERE entity_id = $1 ORDER BY created_at DESC LIMIT 1', [entityId]);
        return res.rows.length ? camelCaseKeys(res.rows[0]) : null;
    }
};
function camelCaseKeys(obj) {
    const newObj = {};
    for (const key in obj) {
        const newKey = key.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
        newObj[newKey] = obj[key];
    }
    return newObj;
}
