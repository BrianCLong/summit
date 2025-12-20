import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import { db } from '../utils/db.js';
import { logger } from '../utils/logger.js';
import type { ConsentRecord, Transaction } from '../models/types.js';

export const consentService = {
  async record(params: {
    dataSubjectId: string;
    productId?: string;
    providerId: string;
    purposes: string[];
    scope: Record<string, unknown>;
    consentMethod: 'explicit' | 'opt-in' | 'contractual';
    expiresAt?: Date;
  }): Promise<ConsentRecord> {
    const id = uuidv4();
    const now = new Date();

    // Create evidence hash for blockchain anchoring
    const evidenceData = JSON.stringify({
      dataSubjectId: params.dataSubjectId,
      purposes: params.purposes,
      scope: params.scope,
      timestamp: now.toISOString(),
    });
    const evidenceHash = crypto
      .createHash('sha256')
      .update(evidenceData)
      .digest('hex');

    const consent: ConsentRecord = {
      id,
      dataSubjectId: params.dataSubjectId,
      productId: params.productId,
      providerId: params.providerId,
      purposes: params.purposes as ConsentRecord['purposes'],
      scope: params.scope,
      grantedAt: now,
      expiresAt: params.expiresAt,
      consentMethod: params.consentMethod,
      evidenceHash,
      version: 1,
      createdAt: now,
    };

    await db.query(
      `INSERT INTO consent_records (
        id, data_subject_id, product_id, provider_id,
        purposes, scope, granted_at, expires_at,
        consent_method, evidence_hash, version, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [
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
      ]
    );

    logger.info('Consent recorded', {
      consentId: id,
      dataSubjectId: params.dataSubjectId,
      providerId: params.providerId,
    });

    return consent;
  },

  async revoke(id: string, reason?: string): Promise<ConsentRecord | null> {
    const result = await db.query(
      `UPDATE consent_records
       SET revoked_at = NOW(), revocation_reason = $1
       WHERE id = $2 AND revoked_at IS NULL
       RETURNING *`,
      [reason, id]
    );

    if (result.rows[0]) {
      logger.info('Consent revoked', { consentId: id, reason });
      return mapRowToConsent(result.rows[0]);
    }
    return null;
  },

  async findBySubject(dataSubjectId: string): Promise<ConsentRecord[]> {
    const result = await db.query(
      `SELECT * FROM consent_records
       WHERE data_subject_id = $1
       ORDER BY created_at DESC`,
      [dataSubjectId]
    );
    return result.rows.map(mapRowToConsent);
  },

  async findActiveByProduct(productId: string): Promise<ConsentRecord[]> {
    const result = await db.query(
      `SELECT * FROM consent_records
       WHERE product_id = $1
         AND revoked_at IS NULL
         AND (expires_at IS NULL OR expires_at > NOW())
       ORDER BY created_at DESC`,
      [productId]
    );
    return result.rows.map(mapRowToConsent);
  },

  async verifyForTransaction(transaction: Transaction): Promise<boolean> {
    // Check if there's valid consent for the product
    const result = await db.query(
      `SELECT COUNT(*) FROM consent_records
       WHERE (product_id = $1 OR provider_id = $2)
         AND revoked_at IS NULL
         AND (expires_at IS NULL OR expires_at > NOW())`,
      [transaction.productId, transaction.sellerId]
    );

    const count = parseInt(result.rows[0].count, 10);

    // For now, consider consent verified if any valid consent exists
    // In production, would check specific purposes match transaction usage
    return count > 0;
  },

  async handleDSAR(dataSubjectId: string): Promise<{
    consents: ConsentRecord[];
    exportData: Record<string, unknown>;
  }> {
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

  async handleErasureRequest(dataSubjectId: string): Promise<{
    erasedCount: number;
  }> {
    // Right to Erasure (GDPR Article 17)
    const result = await db.query(
      `UPDATE consent_records
       SET revoked_at = NOW(), revocation_reason = 'ERASURE_REQUEST'
       WHERE data_subject_id = $1 AND revoked_at IS NULL`,
      [dataSubjectId]
    );

    logger.info('Erasure request processed', {
      dataSubjectId,
      erasedCount: result.rowCount,
    });

    return { erasedCount: result.rowCount || 0 };
  },
};

function mapRowToConsent(row: Record<string, unknown>): ConsentRecord {
  return {
    id: row.id as string,
    dataSubjectId: row.data_subject_id as string,
    productId: row.product_id as string | undefined,
    providerId: row.provider_id as string,
    purposes: row.purposes as ConsentRecord['purposes'],
    scope: row.scope as Record<string, unknown>,
    grantedAt: row.granted_at as Date,
    expiresAt: row.expires_at as Date | undefined,
    revokedAt: row.revoked_at as Date | undefined,
    revocationReason: row.revocation_reason as string | undefined,
    consentMethod: row.consent_method as ConsentRecord['consentMethod'],
    evidenceHash: row.evidence_hash as string,
    version: row.version as number,
    createdAt: row.created_at as Date,
  };
}
