/**
 * License Registry and Enforcement Service
 *
 * Manages data licenses, Terms of Service compliance, and license enforcement:
 * - License creation and registration
 * - License assignment to resources
 * - License validation and enforcement
 * - TOS acceptance tracking
 * - License compatibility checking
 * - License lineage and inheritance
 * - Export control enforcement
 */

import { Pool } from 'pg';
import pino from 'pino';
import type {
  License,
  LicenseType,
  LicenseStatus,
  LicenseValidationResult,
  LicenseCondition,
  Action,
} from './types';
import { LicenseError } from './types';

const logger = pino({ name: 'license-service' });

// ============================================================================
// Interfaces
// ============================================================================

export interface CreateLicenseInput {
  tenantId: string;
  licenseKey: string;
  licenseName: string;
  licenseType: LicenseType;
  licenseVersion?: string;
  licenseFamily?: string;
  permissions: {
    read: boolean;
    copy: boolean;
    modify: boolean;
    distribute: boolean;
    commercialUse: boolean;
    createDerivatives: boolean;
  };
  restrictions?: {
    attribution?: boolean;
    shareAlike?: boolean;
    nonCommercial?: boolean;
    noDerivatives?: boolean;
    timeLimited?: boolean;
    geographicLimited?: boolean;
  };
  requiresAttribution?: boolean;
  attributionText?: string;
  requiresNotice?: boolean;
  noticeText?: string;
  exportControlled?: boolean;
  exportControlClassification?: string;
  permittedCountries?: string[];
  prohibitedCountries?: string[];
  effectiveDate?: Date;
  expiryDate?: Date;
  termsUrl?: string;
  fullText?: string;
  summary?: string;
  createdBy: string;
}

export interface AssignLicenseInput {
  licenseId: string;
  tenantId: string;
  resourceType: string;
  resourceId: string;
  appliesToDerivatives?: boolean;
  inheritanceDepth?: number;
  assignedBy: string;
  assignmentReason?: string;
}

export interface AcceptTOSInput {
  tenantId: string;
  userId: string;
  userEmail: string;
  userRole?: string;
  tosVersion: string;
  tosType: 'PLATFORM_TOS' | 'DATA_LICENSE' | 'EXPORT_TERMS' | 'NDA' | 'DUA' | 'PRIVACY_POLICY';
  tosContentHash: string;
  acceptanceMethod: 'CLICK_THROUGH' | 'SIGNATURE' | 'IMPLICIT' | 'CONTRACT';
  relatedLicenseId?: string;
  relatedResourceType?: string;
  relatedResourceId?: string;
  validUntil?: Date;
  ip?: string;
  userAgent?: string;
}

export interface LicenseEnforcementInput {
  tenantId: string;
  userId: string;
  userEmail: string;
  action: Action;
  resourceType: string;
  resourceId: string;
  licenseId?: string;
  ip?: string;
  userAgent?: string;
  sessionId?: string;
  requestId?: string;
}

// ============================================================================
// Service
// ============================================================================

export class LicenseService {
  private db: Pool;

  constructor(databaseUrl?: string) {
    this.db = new Pool({
      connectionString: databaseUrl || process.env.DATABASE_URL || 'postgresql://localhost:5432/intelgraph',
      max: 20,
    });
  }

  // ==========================================================================
  // License Creation and Registration
  // ==========================================================================

  /**
   * Create a new license
   */
  async createLicense(input: CreateLicenseInput): Promise<License> {
    try {
      // Validate license doesn't already exist
      const existing = await this.db.query(
        `SELECT license_id FROM licenses
         WHERE tenant_id = $1 AND license_key = $2`,
        [input.tenantId, input.licenseKey]
      );

      if (existing.rows.length > 0) {
        throw new LicenseError(
          `License ${input.licenseKey} already exists for tenant ${input.tenantId}`,
          'LICENSE_ALREADY_EXISTS',
          400
        );
      }

      // Insert license
      const result = await this.db.query(
        `INSERT INTO licenses (
          tenant_id, license_key, license_name, license_version, license_family,
          license_type, permissions, restrictions,
          requires_attribution, attribution_text, requires_notice, notice_text,
          export_controlled, export_control_classification,
          permitted_countries, prohibited_countries,
          effective_date, expiry_date, terms_url, full_text, summary,
          created_by, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23)
        RETURNING *`,
        [
          input.tenantId,
          input.licenseKey,
          input.licenseName,
          input.licenseVersion || null,
          input.licenseFamily || null,
          input.licenseType,
          JSON.stringify(input.permissions),
          JSON.stringify(input.restrictions || {}),
          input.requiresAttribution || false,
          input.attributionText || null,
          input.requiresNotice || false,
          input.noticeText || null,
          input.exportControlled || false,
          input.exportControlClassification || null,
          input.permittedCountries || null,
          input.prohibitedCountries || null,
          input.effectiveDate || new Date(),
          input.expiryDate || null,
          input.termsUrl || null,
          input.fullText || null,
          input.summary || null,
          input.createdBy,
          'ACTIVE',
        ]
      );

      const license = this.mapRowToLicense(result.rows[0]);

      logger.info(
        { licenseId: license.licenseId, licenseKey: input.licenseKey, tenantId: input.tenantId },
        'License created'
      );

      return license;

    } catch (error) {
      logger.error({ error, input }, 'Failed to create license');
      throw error;
    }
  }

  /**
   * Update license status
   */
  async updateLicenseStatus(
    licenseId: string,
    status: LicenseStatus,
    updatedBy: string
  ): Promise<void> {
    try {
      const result = await this.db.query(
        `UPDATE licenses
         SET status = $1, updated_by = $2, updated_at = NOW()
         WHERE license_id = $3`,
        [status, updatedBy, licenseId]
      );

      if (result.rowCount === 0) {
        throw new LicenseError('License not found', 'LICENSE_NOT_FOUND', 404);
      }

      logger.info({ licenseId, status, updatedBy }, 'License status updated');

    } catch (error) {
      logger.error({ error, licenseId, status }, 'Failed to update license status');
      throw error;
    }
  }

  // ==========================================================================
  // License Assignment
  // ==========================================================================

  /**
   * Assign license to a resource
   */
  async assignLicense(input: AssignLicenseInput): Promise<string> {
    const client = await this.db.connect();

    try {
      await client.query('BEGIN');

      // Validate license exists and is active
      const licenseResult = await client.query(
        `SELECT status, expiry_date FROM licenses WHERE license_id = $1`,
        [input.licenseId]
      );

      if (licenseResult.rows.length === 0) {
        throw new LicenseError('License not found', 'LICENSE_NOT_FOUND', 404);
      }

      const license = licenseResult.rows[0];
      if (license.status !== 'ACTIVE') {
        throw new LicenseError(
          `Cannot assign license with status ${license.status}`,
          'LICENSE_NOT_ACTIVE',
          400
        );
      }

      if (license.expiry_date && new Date(license.expiry_date) < new Date()) {
        throw new LicenseError('License has expired', 'LICENSE_EXPIRED', 400);
      }

      // Check for existing active assignment
      const existingAssignment = await client.query(
        `SELECT assignment_id FROM data_license_assignments
         WHERE resource_type = $1 AND resource_id = $2 AND tenant_id = $3
           AND assignment_status = 'ACTIVE'`,
        [input.resourceType, input.resourceId, input.tenantId]
      );

      // Revoke existing assignment if present
      if (existingAssignment.rows.length > 0) {
        await client.query(
          `UPDATE data_license_assignments
           SET assignment_status = 'REVOKED',
               revoked_by = $1,
               revoked_at = NOW(),
               revocation_reason = 'Superseded by new license assignment'
           WHERE assignment_id = $2`,
          [input.assignedBy, existingAssignment.rows[0].assignment_id]
        );
      }

      // Create new assignment
      const result = await client.query(
        `INSERT INTO data_license_assignments (
          license_id, tenant_id, resource_type, resource_id,
          applies_to_derivatives, inheritance_depth, assigned_by, assignment_reason
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING assignment_id`,
        [
          input.licenseId,
          input.tenantId,
          input.resourceType,
          input.resourceId,
          input.appliesToDerivatives !== false, // Default true
          input.inheritanceDepth || null,
          input.assignedBy,
          input.assignmentReason || null,
        ]
      );

      const assignmentId = result.rows[0].assignment_id;

      await client.query('COMMIT');

      logger.info(
        {
          assignmentId,
          licenseId: input.licenseId,
          resourceType: input.resourceType,
          resourceId: input.resourceId,
        },
        'License assigned to resource'
      );

      return assignmentId;

    } catch (error) {
      await client.query('ROLLBACK');
      logger.error({ error, input }, 'Failed to assign license');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Revoke license assignment
   */
  async revokeLicenseAssignment(
    assignmentId: string,
    revokedBy: string,
    reason: string
  ): Promise<void> {
    try {
      const result = await this.db.query(
        `UPDATE data_license_assignments
         SET assignment_status = 'REVOKED',
             revoked_by = $1,
             revoked_at = NOW(),
             revocation_reason = $2
         WHERE assignment_id = $3 AND assignment_status = 'ACTIVE'`,
        [revokedBy, reason, assignmentId]
      );

      if (result.rowCount === 0) {
        throw new LicenseError('Active assignment not found', 'ASSIGNMENT_NOT_FOUND', 404);
      }

      logger.info({ assignmentId, revokedBy, reason }, 'License assignment revoked');

    } catch (error) {
      logger.error({ error, assignmentId }, 'Failed to revoke license assignment');
      throw error;
    }
  }

  // ==========================================================================
  // License Validation and Enforcement
  // ==========================================================================

  /**
   * Validate license for action
   */
  async validateLicense(
    tenantId: string,
    resourceType: string,
    resourceId: string,
    action: Action
  ): Promise<LicenseValidationResult> {
    try {
      // Get active license for resource
      const licenseId = await this.getActiveLicenseForResource(tenantId, resourceType, resourceId);

      if (!licenseId) {
        // No license required for this resource
        return { valid: true };
      }

      // Check if action is permitted using database function
      const permitted = await this.db.query<{ is_permitted: boolean }>(
        `SELECT is_action_permitted_by_license($1, $2) as is_permitted`,
        [licenseId, action]
      );

      if (!permitted.rows[0]?.is_permitted) {
        return {
          valid: false,
          reason: `License does not permit '${action}' action`,
          blockedActions: [action],
        };
      }

      // Fetch full license details
      const licenseResult = await this.db.query(
        `SELECT * FROM licenses WHERE license_id = $1 AND status = 'ACTIVE'`,
        [licenseId]
      );

      if (licenseResult.rows.length === 0) {
        return { valid: false, reason: 'License not active' };
      }

      const license = this.mapRowToLicense(licenseResult.rows[0]);

      // Build conditions based on license
      const conditions: LicenseCondition[] = [];

      if (license.requiresAttribution) {
        conditions.push({
          type: 'ATTRIBUTION',
          requirement: license.attributionText || 'Attribution required',
          details: { text: license.attributionText },
        });
      }

      if (license.requiresNotice) {
        conditions.push({
          type: 'NOTICE',
          requirement: license.noticeText || 'Notice required',
          details: { text: license.noticeText },
        });
      }

      if (license.exportControlled) {
        conditions.push({
          type: 'EXPORT_CONTROL',
          requirement: 'Subject to export control regulations',
          details: {
            classification: license.exportControlClassification,
            permittedCountries: license.permittedCountries,
            prohibitedCountries: license.prohibitedCountries,
          },
        });
      }

      return {
        valid: true,
        license,
        conditions,
      };

    } catch (error) {
      logger.error({ error, tenantId, resourceType, resourceId }, 'License validation error');
      return {
        valid: false,
        reason: 'License validation failed',
      };
    }
  }

  /**
   * Get active license for resource
   */
  async getActiveLicenseForResource(
    tenantId: string,
    resourceType: string,
    resourceId: string
  ): Promise<string | null> {
    try {
      const result = await this.db.query<{ license_id: string }>(
        `SELECT get_active_license_for_resource($1, $2, $3) as license_id`,
        [tenantId, resourceType, resourceId]
      );
      return result.rows[0]?.license_id || null;
    } catch (error) {
      logger.error({ error, tenantId, resourceType, resourceId }, 'Failed to get active license');
      return null;
    }
  }

  /**
   * Log license enforcement decision
   */
  async logEnforcement(
    input: LicenseEnforcementInput,
    decision: 'ALLOW' | 'DENY' | 'ALLOW_WITH_CONDITIONS',
    reason: string,
    conditions?: LicenseCondition[],
    applicableLicenses?: string[]
  ): Promise<void> {
    try {
      await this.db.query(
        `INSERT INTO license_enforcement_log (
          tenant_id, user_id, user_email, action, resource_type, resource_id,
          applicable_licenses, primary_license_id, license_decision, decision_reason,
          conditions, ip_address, user_agent, session_id, request_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
        [
          input.tenantId,
          input.userId,
          input.userEmail,
          input.action,
          input.resourceType,
          input.resourceId,
          applicableLicenses || null,
          input.licenseId || null,
          decision,
          reason,
          conditions ? JSON.stringify(conditions) : null,
          input.ip || null,
          input.userAgent || null,
          input.sessionId || null,
          input.requestId || null,
        ]
      );

    } catch (error) {
      logger.error({ error, input }, 'Failed to log license enforcement');
      // Don't throw - logging failure shouldn't block enforcement
    }
  }

  // ==========================================================================
  // TOS Acceptance
  // ==========================================================================

  /**
   * Record TOS acceptance
   */
  async acceptTOS(input: AcceptTOSInput): Promise<string> {
    try {
      const result = await this.db.query(
        `INSERT INTO tos_acceptances (
          tenant_id, user_id, user_email, user_role, tos_version, tos_type,
          tos_content_hash, acceptance_method, related_license_id,
          related_resource_type, related_resource_id, valid_until,
          ip_address, user_agent
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING acceptance_id`,
        [
          input.tenantId,
          input.userId,
          input.userEmail,
          input.userRole || null,
          input.tosVersion,
          input.tosType,
          input.tosContentHash,
          input.acceptanceMethod,
          input.relatedLicenseId || null,
          input.relatedResourceType || null,
          input.relatedResourceId || null,
          input.validUntil || null,
          input.ip || null,
          input.userAgent || null,
        ]
      );

      const acceptanceId = result.rows[0].acceptance_id;

      logger.info(
        { acceptanceId, userId: input.userId, tosVersion: input.tosVersion, tosType: input.tosType },
        'TOS acceptance recorded'
      );

      return acceptanceId;

    } catch (error) {
      logger.error({ error, input }, 'Failed to record TOS acceptance');
      throw error;
    }
  }

  /**
   * Check if user has accepted TOS
   */
  async hasUserAcceptedTOS(
    userId: string,
    tosVersion: string,
    tosType: string
  ): Promise<boolean> {
    try {
      const result = await this.db.query<{ has_accepted: boolean }>(
        `SELECT has_user_accepted_tos($1, $2, $3) as has_accepted`,
        [userId, tosVersion, tosType]
      );
      return result.rows[0]?.has_accepted || false;
    } catch (error) {
      logger.error({ error, userId, tosVersion, tosType }, 'TOS acceptance check failed');
      return false;
    }
  }

  // ==========================================================================
  // License Compatibility
  // ==========================================================================

  /**
   * Check if two licenses are compatible
   */
  async areLicensesCompatible(
    licenseAId: string,
    licenseBId: string
  ): Promise<{ compatible: boolean; reason?: string }> {
    try {
      const result = await this.db.query<{ compatible: boolean }>(
        `SELECT are_licenses_compatible($1, $2) as compatible`,
        [licenseAId, licenseBId]
      );

      const compatible = result.rows[0]?.compatible || false;

      if (!compatible) {
        // Fetch compatibility details if available
        const detailsResult = await this.db.query(
          `SELECT compatibility_level, compatibility_reason
           FROM license_compatibility_matrix
           WHERE (license_a_id = $1 AND license_b_id = $2)
              OR (license_a_id = $2 AND license_b_id = $1)`,
          [licenseAId, licenseBId]
        );

        if (detailsResult.rows.length > 0) {
          return {
            compatible: false,
            reason: detailsResult.rows[0].compatibility_reason || 'Licenses are incompatible',
          };
        }

        return { compatible: false, reason: 'License compatibility not assessed' };
      }

      return { compatible: true };

    } catch (error) {
      logger.error({ error, licenseAId, licenseBId }, 'License compatibility check failed');
      return { compatible: false, reason: 'Compatibility check failed' };
    }
  }

  /**
   * Record license lineage (for derived data)
   */
  async recordLicenseLineage(
    tenantId: string,
    sourceAssignmentId: string,
    sourceResourceType: string,
    sourceResourceId: string,
    sourceLicenseId: string,
    derivedResourceType: string,
    derivedResourceId: string,
    transformationType: string,
    createdBy: string,
    lineageDepth: number = 1
  ): Promise<string> {
    try {
      const result = await this.db.query(
        `INSERT INTO license_lineage (
          tenant_id, source_assignment_id, source_resource_type, source_resource_id,
          source_license_id, derived_resource_type, derived_resource_id,
          transformation_type, lineage_depth, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING lineage_id`,
        [
          tenantId,
          sourceAssignmentId,
          sourceResourceType,
          sourceResourceId,
          sourceLicenseId,
          derivedResourceType,
          derivedResourceId,
          transformationType,
          lineageDepth,
          createdBy,
        ]
      );

      const lineageId = result.rows[0].lineage_id;

      logger.info(
        { lineageId, sourceResourceId, derivedResourceId, transformationType },
        'License lineage recorded'
      );

      return lineageId;

    } catch (error) {
      logger.error({ error }, 'Failed to record license lineage');
      throw error;
    }
  }

  // ==========================================================================
  // Utility Methods
  // ==========================================================================

  /**
   * Map database row to License object
   */
  private mapRowToLicense(row: any): License {
    return {
      licenseId: row.license_id,
      tenantId: row.tenant_id,
      licenseKey: row.license_key,
      licenseName: row.license_name,
      licenseType: row.license_type,
      status: row.status,
      permissions: typeof row.permissions === 'string' ? JSON.parse(row.permissions) : row.permissions,
      restrictions: typeof row.restrictions === 'string' ? JSON.parse(row.restrictions) : row.restrictions,
      requiresAttribution: row.requires_attribution,
      attributionText: row.attribution_text,
      requiresNotice: row.requires_notice,
      noticeText: row.notice_text,
      requiresSignature: row.requires_signature,
      exportControlled: row.export_controlled,
      exportControlClassification: row.export_control_classification,
      permittedCountries: row.permitted_countries,
      prohibitedCountries: row.prohibited_countries,
      effectiveDate: new Date(row.effective_date),
      expiryDate: row.expiry_date ? new Date(row.expiry_date) : undefined,
      termsUrl: row.terms_url,
      metadata: row.metadata,
    };
  }

  /**
   * Close database connections
   */
  async close(): Promise<void> {
    await this.db.end();
  }
}
