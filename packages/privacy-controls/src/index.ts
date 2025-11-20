/**
 * Privacy Controls System
 * GDPR/CCPA compliance with PII detection, right to be forgotten, and consent management
 */

import { Pool } from 'pg';
import { randomUUID } from 'node:crypto';
import { PIICategory, GDPRDataSubjectRequest, ConsentRecord } from '@intelgraph/compliance';
import { AuditLogger } from '@intelgraph/audit-logging';

/**
 * PII Detection patterns
 */
const PII_PATTERNS = {
  [PIICategory.EMAIL]: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
  [PIICategory.PHONE]: /\b(?:\+?1[-.]?)?\\(?\\d{3}\\)?[-.]?\\d{3}[-.]?\\d{4}\b/g,
  [PIICategory.SSN]: /\b\d{3}-\d{2}-\d{4}\b/g,
  [PIICategory.ADDRESS]: /\b\d+\s+[\w\s]+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Lane|Ln|Drive|Dr|Court|Ct|Circle|Cir)\b/gi,
  [PIICategory.FINANCIAL]: /\b(?:\d{4}[-\s]?){3}\d{4}\b/g,
  [PIICategory.GOVERNMENT_ID]: /\b[A-Z]{1,2}\d{6,9}\b/g,
};

export interface PIIDetectionResult {
  hasPII: boolean;
  categories: PIICategory[];
  matches: Array<{
    category: PIICategory;
    value: string;
    position: number;
  }>;
  redactedText: string;
}

export class PrivacyControlsManager {
  private pool: Pool;
  private auditLogger?: AuditLogger;

  constructor(pool: Pool, auditLogger?: AuditLogger) {
    this.pool = pool;
    this.auditLogger = auditLogger;
  }

  /**
   * Initialize privacy controls tables
   */
  async initialize(): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS gdpr_requests (
          id VARCHAR(255) PRIMARY KEY,
          request_type VARCHAR(50) NOT NULL,
          subject_id VARCHAR(255) NOT NULL,
          subject_email VARCHAR(255) NOT NULL,
          requested_at TIMESTAMPTZ NOT NULL,
          status VARCHAR(50) NOT NULL,
          completed_at TIMESTAMPTZ,
          verification_method VARCHAR(255) NOT NULL,
          data_exported TEXT,
          deletion_confirmed BOOLEAN DEFAULT FALSE,
          processing_notes TEXT,
          legal_basis TEXT,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS consent_records (
          id VARCHAR(255) PRIMARY KEY,
          user_id VARCHAR(255) NOT NULL,
          purpose TEXT NOT NULL,
          consent_type VARCHAR(50) NOT NULL,
          granted BOOLEAN NOT NULL,
          granted_at TIMESTAMPTZ,
          revoked_at TIMESTAMPTZ,
          expires_at TIMESTAMPTZ,
          version VARCHAR(50) NOT NULL,
          ip_address INET,
          user_agent TEXT,
          evidence TEXT,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS pii_inventory (
          id VARCHAR(255) PRIMARY KEY,
          table_name VARCHAR(255) NOT NULL,
          column_name VARCHAR(255) NOT NULL,
          pii_category VARCHAR(50) NOT NULL,
          encryption_required BOOLEAN DEFAULT TRUE,
          masking_rule TEXT,
          retention_days INTEGER,
          description TEXT,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          UNIQUE(table_name, column_name)
        );

        CREATE INDEX IF NOT EXISTS idx_gdpr_requests_subject ON gdpr_requests(subject_id);
        CREATE INDEX IF NOT EXISTS idx_gdpr_requests_status ON gdpr_requests(status);
        CREATE INDEX IF NOT EXISTS idx_consent_records_user ON consent_records(user_id);
      `);
    } finally {
      client.release();
    }
  }

  /**
   * Detect PII in text
   */
  detectPII(text: string): PIIDetectionResult {
    const matches: Array<{ category: PIICategory; value: string; position: number }> = [];
    const categories = new Set<PIICategory>();
    let redactedText = text;

    for (const [category, pattern] of Object.entries(PII_PATTERNS)) {
      const regex = new RegExp(pattern);
      let match;

      while ((match = regex.exec(text)) !== null) {
        categories.add(category as PIICategory);
        matches.push({
          category: category as PIICategory,
          value: match[0],
          position: match.index,
        });

        // Redact the match
        redactedText = redactedText.replace(match[0], '[REDACTED]');
      }
    }

    return {
      hasPII: matches.length > 0,
      categories: Array.from(categories),
      matches,
      redactedText,
    };
  }

  /**
   * Handle GDPR Data Subject Request
   */
  async handleDataSubjectRequest(
    requestType: 'access' | 'rectification' | 'erasure' | 'portability' | 'restriction' | 'objection',
    subjectId: string,
    subjectEmail: string,
    verificationMethod: string
  ): Promise<GDPRDataSubjectRequest> {
    const request: GDPRDataSubjectRequest = {
      id: randomUUID(),
      requestType,
      subjectId,
      subjectEmail,
      requestedAt: new Date(),
      status: 'received',
      verificationMethod,
    };

    await this.pool.query(
      `INSERT INTO gdpr_requests
       (id, request_type, subject_id, subject_email, requested_at, status, verification_method)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        request.id,
        request.requestType,
        request.subjectId,
        request.subjectEmail,
        request.requestedAt,
        request.status,
        request.verificationMethod,
      ]
    );

    // Audit log
    if (this.auditLogger) {
      await this.auditLogger.log({
        userId: subjectId,
        userName: subjectEmail,
        action: `gdpr.request.${requestType}`,
        resource: 'gdpr_request',
        resourceId: request.id,
        outcome: 'success',
        details: { requestType },
      });
    }

    return request;
  }

  /**
   * Process Right to be Forgotten (GDPR Article 17)
   */
  async processErasureRequest(requestId: string, processorId: string): Promise<{
    deleted: number;
    errors: string[];
  }> {
    const client = await this.pool.connect();
    const errors: string[] = [];
    let totalDeleted = 0;

    try {
      await client.query('BEGIN');

      // Get request
      const requestResult = await client.query(
        'SELECT * FROM gdpr_requests WHERE id = $1 AND request_type = $2',
        [requestId, 'erasure']
      );

      if (requestResult.rows.length === 0) {
        throw new Error('Erasure request not found');
      }

      const request = requestResult.rows[0];
      const subjectId = request.subject_id;

      // Get PII inventory to know what to delete
      const inventoryResult = await client.query('SELECT * FROM pii_inventory');

      for (const item of inventoryResult.rows) {
        try {
          // Delete or anonymize PII data
          const deleteQuery = `
            UPDATE ${item.table_name}
            SET ${item.column_name} = '[DELETED]'
            WHERE user_id = $1 OR id = $1
          `;

          const result = await client.query(deleteQuery, [subjectId]);
          totalDeleted += result.rowCount || 0;
        } catch (error) {
          errors.push(`Error processing ${item.table_name}.${item.column_name}: ${error}`);
        }
      }

      // Update request status
      await client.query(
        `UPDATE gdpr_requests
         SET status = 'completed', completed_at = NOW(), deletion_confirmed = TRUE,
             processing_notes = $1
         WHERE id = $2`,
        [`Deleted ${totalDeleted} records. Errors: ${errors.length}`, requestId]
      );

      await client.query('COMMIT');

      // Audit log
      if (this.auditLogger) {
        await this.auditLogger.log({
          userId: processorId,
          userName: processorId,
          action: 'gdpr.erasure.completed',
          resource: 'gdpr_request',
          resourceId: requestId,
          outcome: 'success',
          details: { deleted: totalDeleted, errors: errors.length },
        });
      }
    } catch (error) {
      await client.query('ROLLBACK');
      errors.push(`Transaction error: ${error}`);
    } finally {
      client.release();
    }

    return { deleted: totalDeleted, errors };
  }

  /**
   * Export user data (GDPR Article 20 - Data Portability)
   */
  async exportUserData(subjectId: string): Promise<Record<string, any>> {
    const client = await this.pool.connect();
    const exportData: Record<string, any> = {};

    try {
      // Get PII inventory
      const inventoryResult = await client.query('SELECT DISTINCT table_name FROM pii_inventory');

      for (const row of inventoryResult.rows) {
        const tableName = row.table_name;

        try {
          const dataResult = await client.query(
            `SELECT * FROM ${tableName} WHERE user_id = $1 OR id = $1`,
            [subjectId]
          );

          exportData[tableName] = dataResult.rows;
        } catch (error) {
          console.error(`Error exporting from ${tableName}:`, error);
        }
      }
    } finally {
      client.release();
    }

    return exportData;
  }

  /**
   * Record consent
   */
  async recordConsent(
    userId: string,
    purpose: string,
    granted: boolean,
    consentType: 'explicit' | 'implicit' | 'opt_in' | 'opt_out',
    version: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<ConsentRecord> {
    const consent: ConsentRecord = {
      id: randomUUID(),
      userId,
      purpose,
      consentType,
      granted,
      grantedAt: granted ? new Date() : undefined,
      revokedAt: !granted ? new Date() : undefined,
      version,
      ipAddress,
      userAgent,
    };

    await this.pool.query(
      `INSERT INTO consent_records
       (id, user_id, purpose, consent_type, granted, granted_at, revoked_at, version, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        consent.id,
        consent.userId,
        consent.purpose,
        consent.consentType,
        consent.granted,
        consent.grantedAt,
        consent.revokedAt,
        consent.version,
        consent.ipAddress,
        consent.userAgent,
      ]
    );

    // Audit log
    if (this.auditLogger) {
      await this.auditLogger.log({
        userId,
        userName: userId,
        action: granted ? 'consent.granted' : 'consent.revoked',
        resource: 'consent',
        resourceId: consent.id,
        outcome: 'success',
        details: { purpose, consentType },
      });
    }

    return consent;
  }

  /**
   * Check if user has given consent for a purpose
   */
  async hasConsent(userId: string, purpose: string): Promise<boolean> {
    const result = await this.pool.query(
      `SELECT granted FROM consent_records
       WHERE user_id = $1 AND purpose = $2
       AND (expires_at IS NULL OR expires_at > NOW())
       ORDER BY created_at DESC
       LIMIT 1`,
      [userId, purpose]
    );

    return result.rows.length > 0 && result.rows[0].granted;
  }
}

export * from './chain-of-custody.js';
export * from './segregation-of-duties.js';
