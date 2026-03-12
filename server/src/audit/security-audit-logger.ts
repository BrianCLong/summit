import { advancedAuditSystem } from './index.js';

/**
 * Security Audit Wrapper
 * 
 * Provides high-level methods for common security-relevant audit events.
 * Maps these to the AdvancedAuditSystem for permanent storage and compliance.
 */
export const securityAudit = {
  /**
   * Log a data import event
   */
  logDataImport: async (data: {
    actor: string;
    tenantId: string;
    resourceType: string;
    resourceId: string;
    action: string;
    details?: any;
    ipAddress?: string;
    userAgent?: string;
    dataClassification?: string;
  }) => {
    return advancedAuditSystem.recordEvent({
      eventType: 'data_import',
      level: 'info',
      userId: data.actor,
      tenantId: data.tenantId,
      resourceType: data.resourceType,
      resourceId: data.resourceId,
      action: data.action,
      details: data.details || {},
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
      dataClassification: data.dataClassification as any,
      message: `Data import identified: ${data.resourceType}/${data.action}`,
      complianceRelevant: true,
      complianceFrameworks: ['SOC2', 'NIST'],
    });
  },

  /**
   * Log a sensitive data read event
   */
  logSensitiveRead: async (data: {
    actor: string;
    tenantId: string;
    resourceType: string;
    resourceId: string;
    action: string;
    details?: any;
    ipAddress?: string;
    userAgent?: string;
    dataClassification?: string;
  }) => {
    return advancedAuditSystem.recordEvent({
      eventType: 'resource_access',
      level: 'info',
      userId: data.actor,
      tenantId: data.tenantId,
      resourceType: data.resourceType,
      resourceId: data.resourceId,
      action: data.action,
      details: data.details || {},
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
      dataClassification: data.dataClassification as any,
      message: `Sensitive resource accessed: ${data.resourceType}`,
      complianceRelevant: true,
      complianceFrameworks: ['SOC2', 'NIST'],
    });
  }
};

export default securityAudit;
