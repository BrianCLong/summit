"use strict";
/**
 * HIPAA Compliance Service
 * Implements HIPAA Privacy Rule (164.308, 164.312) and Security Rule requirements
 * Focuses on PHI access logging, minimum necessary rule, and encryption verification
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HIPAAComplianceService = void 0;
const crypto_1 = require("crypto");
const logger_js_1 = __importDefault(require("../config/logger.js"));
const serviceLogger = logger_js_1.default.child({ name: 'HIPAAComplianceService' });
// ============================================================================
// HIPAA COMPLIANCE SERVICE
// ============================================================================
class HIPAAComplianceService {
    pg;
    constructor(pg) {
        this.pg = pg;
    }
    // ==========================================================================
    // PHI ACCESS LOGGING (164.312(b))
    // ==========================================================================
    /**
     * Log PHI access (required by HIPAA 164.312(b))
     */
    async logPHIAccess(access) {
        const accessId = access.accessId || (0, crypto_1.randomUUID)();
        // Validate minimum necessary justification
        if (!access.minimumNecessaryJustification ||
            access.minimumNecessaryJustification.trim() === '') {
            throw new Error('HIPAA Minimum Necessary Rule (164.502(b)) requires justification for PHI access');
        }
        // Validate data elements accessed
        if (!access.dataElementsAccessed || access.dataElementsAccessed.length === 0) {
            throw new Error('Must specify which data elements were accessed per Minimum Necessary Rule');
        }
        // Flag potential security incidents
        const securityIncidentFlagged = this.detectSecurityIncident(access);
        const incidentReason = securityIncidentFlagged
            ? this.getIncidentReason(access)
            : undefined;
        try {
            await this.pg.query(`INSERT INTO hipaa_phi_access_log (
          access_id, tenant_id, phi_type, phi_id, phi_classification,
          access_type, access_purpose, user_id, user_role, user_npi,
          authorization_type, authorization_reference, patient_consent_id,
          minimum_necessary_justification, data_elements_accessed,
          ip_address, user_agent, session_id, workstation_id,
          data_encrypted_at_rest, data_encrypted_in_transit, encryption_algorithm,
          access_timestamp, access_duration_ms,
          security_incident_flagged, incident_reason
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
                $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26)`, [
                accessId,
                access.tenantId,
                access.phiType,
                access.phiId,
                access.phiClassification || 'PHI',
                access.accessType,
                access.accessPurpose,
                access.userId,
                access.userRole,
                access.userNPI || null,
                access.authorizationType,
                access.authorizationReference || null,
                access.patientConsentId || null,
                access.minimumNecessaryJustification,
                access.dataElementsAccessed,
                access.ipAddress,
                access.userAgent || null,
                access.sessionId || null,
                access.workstationId || null,
                access.dataEncryptedAtRest,
                access.dataEncryptedInTransit,
                access.encryptionAlgorithm || null,
                access.accessTimestamp || new Date(),
                access.accessDurationMs || null,
                securityIncidentFlagged,
                incidentReason || null,
            ]);
            serviceLogger.info({
                accessId,
                phiType: access.phiType,
                phiId: access.phiId,
                userId: access.userId,
                accessType: access.accessType,
                accessPurpose: access.accessPurpose,
            }, 'PHI access logged');
            // Create security incident if flagged
            if (securityIncidentFlagged) {
                await this.createSecurityIncident({
                    tenantId: access.tenantId,
                    incidentType: 'unauthorized_phi_access_attempt',
                    incidentSeverity: 'high',
                    incidentDescription: incidentReason || 'Suspicious PHI access detected',
                    affectedPHIIds: [access.phiId],
                    affectedUserIds: [access.userId],
                    detectedAt: new Date(),
                    detectedBy: 'HIPAA_COMPLIANCE_SERVICE',
                    incidentStatus: 'open',
                });
            }
            return { accessId };
        }
        catch (error) {
            serviceLogger.error({ error: error.message, access }, 'Failed to log PHI access');
            throw error;
        }
    }
    /**
     * Get PHI access logs with filters
     */
    async getPHIAccessLogs(filters) {
        const params = [filters.tenantId];
        let sql = `SELECT * FROM hipaa_phi_access_log WHERE tenant_id = $1`;
        let paramIndex = 2;
        if (filters.phiId) {
            sql += ` AND phi_id = $${paramIndex}`;
            params.push(filters.phiId);
            paramIndex++;
        }
        if (filters.userId) {
            sql += ` AND user_id = $${paramIndex}`;
            params.push(filters.userId);
            paramIndex++;
        }
        if (filters.accessType) {
            sql += ` AND access_type = $${paramIndex}`;
            params.push(filters.accessType);
            paramIndex++;
        }
        if (filters.startTime) {
            sql += ` AND access_timestamp >= $${paramIndex}`;
            params.push(filters.startTime);
            paramIndex++;
        }
        if (filters.endTime) {
            sql += ` AND access_timestamp <= $${paramIndex}`;
            params.push(filters.endTime);
            paramIndex++;
        }
        if (filters.incidentFlaggedOnly) {
            sql += ` AND security_incident_flagged = true`;
        }
        sql += ` ORDER BY access_timestamp DESC`;
        if (filters.limit) {
            sql += ` LIMIT $${paramIndex}`;
            params.push(Math.min(filters.limit, 10000));
            paramIndex++;
        }
        if (filters.offset) {
            sql += ` OFFSET $${paramIndex}`;
            params.push(filters.offset);
        }
        const { rows } = await this.pg.query(sql, params);
        return rows.map(this.mapPHIAccessLogRow);
    }
    /**
     * Get PHI access summary for compliance reporting
     */
    async getPHIAccessSummary(tenantId, startDate, endDate) {
        const { rows } = await this.pg.query(`SELECT
        COUNT(*) as total_accesses,
        COUNT(DISTINCT user_id) as unique_users,
        COUNT(DISTINCT phi_id) as unique_phi_records,
        COUNT(*) FILTER (WHERE security_incident_flagged = true) as incident_count,
        COUNT(*) FILTER (WHERE data_encrypted_at_rest = true AND data_encrypted_in_transit = true) as compliant_accesses,
        jsonb_object_agg(access_purpose, access_purpose_count) FILTER (WHERE access_purpose IS NOT NULL) as accesses_by_purpose,
        jsonb_object_agg(access_type, access_type_count) FILTER (WHERE access_type IS NOT NULL) as accesses_by_type
      FROM (
        SELECT
          user_id,
          phi_id,
          security_incident_flagged,
          data_encrypted_at_rest,
          data_encrypted_in_transit,
          access_purpose,
          COUNT(*) OVER (PARTITION BY access_purpose) as access_purpose_count,
          access_type,
          COUNT(*) OVER (PARTITION BY access_type) as access_type_count
        FROM hipaa_phi_access_log
        WHERE tenant_id = $1
          AND access_timestamp BETWEEN $2 AND $3
      ) sub`, [tenantId, startDate, endDate]);
        const row = rows[0];
        return {
            totalAccesses: parseInt(row.total_accesses || '0', 10),
            uniqueUsers: parseInt(row.unique_users || '0', 10),
            uniquePHIRecords: parseInt(row.unique_phi_records || '0', 10),
            accessesByPurpose: row.accesses_by_purpose || {},
            accessesByType: row.accesses_by_type || {},
            incidentCount: parseInt(row.incident_count || '0', 10),
            complianceRate: parseInt(row.total_accesses || '0', 10) > 0
                ? parseInt(row.compliant_accesses || '0', 10) /
                    parseInt(row.total_accesses || '0', 10)
                : 1.0,
        };
    }
    // ==========================================================================
    // SECURITY INCIDENT MANAGEMENT
    // ==========================================================================
    /**
     * Create a security incident
     */
    async createSecurityIncident(incident) {
        const incidentId = incident.incidentId || (0, crypto_1.randomUUID)();
        await this.pg.query(`INSERT INTO compliance_alerts (
        alert_id, tenant_id, alert_type, alert_severity, alert_title, alert_description,
        resource_type, affected_count, regulation, alert_status, alert_metadata, created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`, [
            incidentId,
            incident.tenantId,
            incident.incidentType,
            incident.incidentSeverity,
            `HIPAA Security Incident: ${incident.incidentType}`,
            incident.incidentDescription,
            'phi_access',
            incident.affectedPHIIds.length,
            'HIPAA',
            incident.incidentStatus,
            JSON.stringify({
                affectedPHIIds: incident.affectedPHIIds,
                affectedUserIds: incident.affectedUserIds,
                detectedBy: incident.detectedBy,
                breachNotificationRequired: incident.breachNotificationRequired,
            }),
            incident.detectedAt,
        ]);
        serviceLogger.warn({
            incidentId,
            incidentType: incident.incidentType,
            incidentSeverity: incident.incidentSeverity,
            affectedPHICount: incident.affectedPHIIds.length,
        }, 'HIPAA security incident created');
        return { incidentId };
    }
    /**
     * Get open security incidents
     */
    async getOpenSecurityIncidents(tenantId) {
        const { rows } = await this.pg.query(`SELECT * FROM compliance_alerts
       WHERE tenant_id = $1
         AND regulation = 'HIPAA'
         AND alert_status IN ('open', 'acknowledged', 'investigating')
       ORDER BY alert_severity DESC, created_at DESC`, [tenantId]);
        return rows;
    }
    // ==========================================================================
    // ENCRYPTION VERIFICATION (164.312(a)(2)(iv))
    // ==========================================================================
    /**
     * Verify encryption compliance for a resource
     */
    async verifyEncryptionCompliance(audit) {
        const auditId = audit.auditId || (0, crypto_1.randomUUID)();
        // Determine compliance status
        let complianceStatus = 'compliant';
        const issues = [];
        if (!audit.encryptionAtRest) {
            complianceStatus = 'non_compliant';
            issues.push('Data not encrypted at rest - violates HIPAA 164.312(a)(2)(iv)');
        }
        if (!audit.encryptionInTransit) {
            complianceStatus = 'non_compliant';
            issues.push('Data not encrypted in transit - violates HIPAA 164.312(e)(1)');
        }
        if (!audit.encryptionAlgorithm || audit.encryptionAlgorithm === 'none') {
            complianceStatus = 'non_compliant';
            issues.push('No encryption algorithm specified');
        }
        // Log to compliance metrics
        await this.pg.query(`INSERT INTO compliance_metrics (
        tenant_id, metric_type, metric_name, metric_value, metric_unit,
        threshold_breached, severity, period_start, period_end, metric_metadata
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`, [
            audit.tenantId,
            'encryption_compliance',
            'hipaa_encryption_audit',
            complianceStatus === 'compliant' ? 1 : 0,
            'boolean',
            complianceStatus !== 'compliant',
            complianceStatus !== 'compliant' ? 'critical' : 'info',
            audit.auditedAt,
            audit.auditedAt,
            JSON.stringify({
                auditId,
                resourceType: audit.resourceType,
                resourceId: audit.resourceId,
                encryptionAtRest: audit.encryptionAtRest,
                encryptionInTransit: audit.encryptionInTransit,
                encryptionAlgorithm: audit.encryptionAlgorithm,
                issues,
            }),
        ]);
        // Create alert if non-compliant
        if (complianceStatus === 'non_compliant') {
            await this.createSecurityIncident({
                tenantId: audit.tenantId,
                incidentType: 'encryption_compliance_violation',
                incidentSeverity: 'critical',
                incidentDescription: `Encryption compliance violation: ${issues.join(', ')}`,
                affectedPHIIds: [audit.resourceId],
                affectedUserIds: [],
                detectedAt: audit.auditedAt,
                detectedBy: audit.auditedBy,
                incidentStatus: 'open',
                breachNotificationRequired: true,
            });
        }
        serviceLogger.info({
            auditId,
            resourceType: audit.resourceType,
            resourceId: audit.resourceId,
            complianceStatus,
        }, 'Encryption compliance verified');
        return { auditId, complianceStatus };
    }
    // ==========================================================================
    // HELPER METHODS
    // ==========================================================================
    /**
     * Detect potential security incidents based on access patterns
     */
    detectSecurityIncident(access) {
        // Flag emergency access for review
        if (access.authorizationType === 'emergency_access') {
            return true;
        }
        // Flag if encryption is not in place
        if (!access.dataEncryptedAtRest || !access.dataEncryptedInTransit) {
            return true;
        }
        // Flag if minimum necessary justification is suspiciously short
        if (access.minimumNecessaryJustification.length < 20) {
            return true;
        }
        // Flag if too many data elements accessed
        if (access.dataElementsAccessed.length > 50) {
            return true;
        }
        return false;
    }
    /**
     * Get incident reason based on access pattern
     */
    getIncidentReason(access) {
        const reasons = [];
        if (access.authorizationType === 'emergency_access') {
            reasons.push('Emergency break-glass access requires review');
        }
        if (!access.dataEncryptedAtRest || !access.dataEncryptedInTransit) {
            reasons.push('PHI accessed without proper encryption');
        }
        if (access.minimumNecessaryJustification.length < 20) {
            reasons.push('Insufficient minimum necessary justification');
        }
        if (access.dataElementsAccessed.length > 50) {
            reasons.push('Excessive data elements accessed');
        }
        return reasons.join('; ');
    }
    /**
     * Map database row to PHIAccessLog
     */
    mapPHIAccessLogRow(row) {
        return {
            accessId: row.access_id,
            tenantId: row.tenant_id,
            phiType: row.phi_type,
            phiId: row.phi_id,
            phiClassification: row.phi_classification,
            accessType: row.access_type,
            accessPurpose: row.access_purpose,
            userId: row.user_id,
            userRole: row.user_role,
            userNPI: row.user_npi || undefined,
            authorizationType: row.authorization_type,
            authorizationReference: row.authorization_reference || undefined,
            patientConsentId: row.patient_consent_id || undefined,
            minimumNecessaryJustification: row.minimum_necessary_justification,
            dataElementsAccessed: row.data_elements_accessed,
            ipAddress: row.ip_address,
            userAgent: row.user_agent || undefined,
            sessionId: row.session_id || undefined,
            workstationId: row.workstation_id || undefined,
            dataEncryptedAtRest: row.data_encrypted_at_rest,
            dataEncryptedInTransit: row.data_encrypted_in_transit,
            encryptionAlgorithm: row.encryption_algorithm || undefined,
            accessTimestamp: row.access_timestamp,
            accessDurationMs: row.access_duration_ms || undefined,
            securityIncidentFlagged: row.security_incident_flagged || false,
            incidentReason: row.incident_reason || undefined,
        };
    }
}
exports.HIPAAComplianceService = HIPAAComplianceService;
