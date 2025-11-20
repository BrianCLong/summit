/**
 * Audit Logging Middleware
 *
 * Comprehensive audit trail for all data access and operations
 */

import { Request, Response, NextFunction } from 'express';
import { AuthorizedUser } from './authMiddleware';

export interface AuditEntry {
  timestamp: Date;
  userId: string;
  username: string;
  agency: string;
  action: string;
  resource: string;
  resourceId?: string;
  method: string;
  path: string;
  ipAddress: string;
  userAgent: string;
  justification?: string;
  legalAuthorityRef?: string;
  statusCode?: number;
  success: boolean;
  errorMessage?: string;
  dataAccessed?: string[]; // List of sensitive data accessed
  queryParams?: Record<string, any>;
  bodyParams?: Record<string, any>;
}

/**
 * Comprehensive audit logging for all requests
 */
export const auditLogger = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const user = req.user as AuthorizedUser;
  const startTime = Date.now();

  // Capture response
  const originalSend = res.send;
  let responseBody: any;

  res.send = function (body: any): Response {
    responseBody = body;
    return originalSend.call(this, body);
  };

  // Log on response finish
  res.on('finish', async () => {
    const duration = Date.now() - startTime;

    const auditEntry: AuditEntry = {
      timestamp: new Date(),
      userId: user?.id || 'UNAUTHENTICATED',
      username: user?.username || 'UNKNOWN',
      agency: user?.agency || 'UNKNOWN',
      action: getActionDescription(req),
      resource: getResourceType(req),
      resourceId: req.params.id || req.params.caseId || req.params.organizationId,
      method: req.method,
      path: req.path,
      ipAddress: req.ip || req.connection.remoteAddress || 'UNKNOWN',
      userAgent: req.headers['user-agent'] || 'UNKNOWN',
      justification: req.justification,
      legalAuthorityRef: req.legalAuthorityRef,
      statusCode: res.statusCode,
      success: res.statusCode < 400,
      errorMessage: res.statusCode >= 400 ? extractErrorMessage(responseBody) : undefined,
      dataAccessed: extractAccessedData(req, responseBody),
      queryParams: sanitizeParams(req.query),
      bodyParams: sanitizeParams(req.body)
    };

    // Log to audit system
    await logAuditEntry(auditEntry);

    // Alert on suspicious activity
    if (isSuspiciousActivity(auditEntry)) {
      await alertSecurityTeam(auditEntry);
    }
  });

  next();
};

/**
 * Determine action description from request
 */
function getActionDescription(req: Request): string {
  const method = req.method;
  const path = req.path;

  if (method === 'GET') return 'VIEW';
  if (method === 'POST') return 'CREATE';
  if (method === 'PUT' || method === 'PATCH') return 'UPDATE';
  if (method === 'DELETE') return 'DELETE';
  if (path.includes('/search')) return 'SEARCH';
  if (path.includes('/export')) return 'EXPORT';

  return 'UNKNOWN';
}

/**
 * Extract resource type from path
 */
function getResourceType(req: Request): string {
  const path = req.path;

  if (path.includes('/organizations')) return 'CRIMINAL_ORGANIZATION';
  if (path.includes('/trafficking')) return 'TRAFFICKING_NETWORK';
  if (path.includes('/drug')) return 'DRUG_INTELLIGENCE';
  if (path.includes('/financial-crime')) return 'FINANCIAL_CRIME';
  if (path.includes('/cybercrime')) return 'CYBERCRIME';
  if (path.includes('/corruption')) return 'CORRUPTION';
  if (path.includes('/cases')) return 'INVESTIGATION_CASE';
  if (path.includes('/operations')) return 'LAW_ENFORCEMENT_OPERATION';

  return 'UNKNOWN';
}

/**
 * Extract error message from response
 */
function extractErrorMessage(responseBody: any): string | undefined {
  if (!responseBody) return undefined;

  try {
    const parsed = typeof responseBody === 'string' ? JSON.parse(responseBody) : responseBody;
    return parsed.error || parsed.message;
  } catch {
    return undefined;
  }
}

/**
 * Extract what sensitive data was accessed
 */
function extractAccessedData(req: Request, responseBody: any): string[] | undefined {
  const accessed: string[] = [];

  // Check if victim data was accessed
  if (req.path.includes('/victims') || responseBody?.includes('victims')) {
    accessed.push('VICTIM_DATA');
  }

  // Check if financial data was accessed
  if (req.path.includes('/financial') || responseBody?.includes('bankAccounts')) {
    accessed.push('FINANCIAL_DATA');
  }

  // Check if surveillance data
  if (req.path.includes('/surveillance') || req.path.includes('/wiretap')) {
    accessed.push('SURVEILLANCE_DATA');
  }

  // Check if informant data
  if (req.path.includes('/informant') || req.path.includes('/source')) {
    accessed.push('CONFIDENTIAL_SOURCE');
  }

  return accessed.length > 0 ? accessed : undefined;
}

/**
 * Sanitize parameters to remove sensitive data from audit log
 */
function sanitizeParams(params: any): Record<string, any> | undefined {
  if (!params || typeof params !== 'object') return undefined;

  const sanitized: Record<string, any> = {};
  const sensitiveFields = ['password', 'ssn', 'creditCard', 'apiKey', 'token'];

  for (const [key, value] of Object.entries(params)) {
    if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
      sanitized[key] = '[REDACTED]';
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Detect suspicious activity patterns
 */
function isSuspiciousActivity(entry: AuditEntry): boolean {
  // Excessive data access
  if (entry.action === 'VIEW' && entry.dataAccessed && entry.dataAccessed.length > 5) {
    return true;
  }

  // Failed authentication attempts
  if (entry.statusCode === 401 || entry.statusCode === 403) {
    return true;
  }

  // Bulk export attempts
  if (entry.action === 'EXPORT' && entry.path.includes('/bulk')) {
    return true;
  }

  // Access without justification
  if (!entry.justification && entry.success) {
    return true;
  }

  return false;
}

/**
 * Log audit entry to secure audit system
 */
async function logAuditEntry(entry: AuditEntry): Promise<void> {
  // In production, write to secure, tamper-proof audit log
  // Could be write-once database, blockchain, or WORM storage

  console.log('[AUDIT]', JSON.stringify(entry, null, 2));

  // Store in database
  // await auditDatabase.insert(entry);

  // Archive to long-term storage
  // await archiveToSecureStorage(entry);
}

/**
 * Alert security team of suspicious activity
 */
async function alertSecurityTeam(entry: AuditEntry): Promise<void> {
  console.warn('[SECURITY ALERT]', JSON.stringify(entry, null, 2));

  // In production, send alerts via:
  // - SIEM system
  // - Security operations center
  // - Email/SMS to security team
  // - Incident response system
}

/**
 * Generate audit report for specific user or timeframe
 */
export async function generateAuditReport(params: {
  userId?: string;
  startDate?: Date;
  endDate?: Date;
  action?: string;
  resource?: string;
}): Promise<AuditEntry[]> {
  // Query audit database with filters
  // Return matching audit entries
  return [];
}

/**
 * Export audit logs for legal proceedings
 */
export async function exportAuditLogs(params: {
  caseId: string;
  format: 'JSON' | 'CSV' | 'PDF';
  requestedBy: string;
  legalAuthorityRef: string;
}): Promise<Buffer> {
  // Generate exportable audit trail for court proceedings
  // Include chain of custody documentation
  return Buffer.from('');
}
