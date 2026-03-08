"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.consentService = void 0;
const uuid_1 = require("uuid");
const crypto_1 = __importDefault(require("crypto"));
const db_js_1 = require("../utils/db.js");
const logger_js_1 = require("../utils/logger.js");
exports.consentService = {
    async record(params) {
        const id = (0, uuid_1.v4)();
        const now = new Date();
        // Create evidence hash for blockchain anchoring
        const evidenceData = JSON.stringify({
            dataSubjectId: params.dataSubjectId,
            purposes: params.purposes,
            scope: params.scope,
            timestamp: now.toISOString(),
        });
        const evidenceHash = crypto_1.default
            .createHash('sha256')
            .update(evidenceData)
            .digest('hex');
        const consent = {
            id,
            dataSubjectId: params.dataSubjectId,
            productId: params.productId,
            providerId: params.providerId,
            purposes: params.purposes,
            scope: params.scope,
            grantedAt: now,
            expiresAt: params.expiresAt,
            consentMethod: params.consentMethod,
            evidenceHash,
            version: 1,
            createdAt: now,
        };
        await db_js_1.db.query(`INSERT INTO consent_records (
        id, data_subject_id, product_id, provider_id,
        purposes, scope, granted_at, expires_at,
        consent_method, evidence_hash, version, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`, [
            consent.id,
            consent.dataSubjectId,
            consent.productId,
            consent.providerId,
            JSON.stringify(consent.purposes),
            JSON.stringify(consent.scope),
            consent.grantedAt,
            consent.expiresAt,
            consent.consentMethod,
            consent.evidenceHash,
            consent.version,
            consent.createdAt,
        ]);
        logger_js_1.logger.info('Consent recorded', {
            consentId: id,
            dataSubjectId: params.dataSubjectId,
            providerId: params.providerId,
        });
        return consent;
    },
    async revoke(id, reason) {
        const result = await db_js_1.db.query(`UPDATE consent_records
       SET revoked_at = NOW(), revocation_reason = $1
       WHERE id = $2 AND revoked_at IS NULL
       RETURNING *`, [reason, id]);
        if (result.rows[0]) {
            logger_js_1.logger.info('Consent revoked', { consentId: id, reason });
            return mapRowToConsent(result.rows[0]);
        }
        return null;
    },
    async findBySubject(dataSubjectId) {
        const result = await db_js_1.db.query(`SELECT * FROM consent_records
       WHERE data_subject_id = $1
       ORDER BY created_at DESC`, [dataSubjectId]);
        return result.rows.map(mapRowToConsent);
    },
    async findActiveByProduct(productId) {
        const result = await db_js_1.db.query(`SELECT * FROM consent_records
       WHERE product_id = $1
         AND revoked_at IS NULL
         AND (expires_at IS NULL OR expires_at > NOW())
       ORDER BY created_at DESC`, [productId]);
        return result.rows.map(mapRowToConsent);
    },
    async verifyForTransaction(transaction) {
        // Check if there's valid consent for the product
        const result = await db_js_1.db.query(`SELECT COUNT(*) FROM consent_records
       WHERE (product_id = $1 OR provider_id = $2)
         AND revoked_at IS NULL
         AND (expires_at IS NULL OR expires_at > NOW())`, [transaction.productId, transaction.sellerId]);
        const count = parseInt(result.rows[0].count, 10);
        // For now, consider consent verified if any valid consent exists
        // In production, would check specific purposes match transaction usage
        return count > 0;
    },
    async handleDSAR(dataSubjectId) {
        // Data Subject Access Request (GDPR Article 15)
        const consents = await this.findBySubject(dataSubjectId);
        return {
            consents,
            exportData: {
                dataSubjectId,
                consentHistory: consents,
                exportedAt: new Date().toISOString(),
            },
        };
    },
    async handleErasureRequest(dataSubjectId) {
        // Right to Erasure (GDPR Article 17)
        const result = await db_js_1.db.query(`UPDATE consent_records
       SET revoked_at = NOW(), revocation_reason = 'ERASURE_REQUEST'
       WHERE data_subject_id = $1 AND revoked_at IS NULL`, [dataSubjectId]);
        logger_js_1.logger.info('Erasure request processed', {
            dataSubjectId,
            erasedCount: result.rowCount,
        });
        return { erasedCount: result.rowCount || 0 };
    },
};
function mapRowToConsent(row) {
    return {
        id: row.id,
        dataSubjectId: row.data_subject_id,
        productId: row.product_id,
        providerId: row.provider_id,
        purposes: row.purposes,
        scope: row.scope,
        grantedAt: row.granted_at,
        expiresAt: row.expires_at,
        revokedAt: row.revoked_at,
        revocationReason: row.revocation_reason,
        consentMethod: row.consent_method,
        evidenceHash: row.evidence_hash,
        version: row.version,
        createdAt: row.created_at,
    };
}
