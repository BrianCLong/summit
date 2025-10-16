/**
 * Audit Middleware for Express/GraphQL Integration
 * Automatically captures HTTP requests and GraphQL operations
 */

import { Request, Response, NextFunction } from 'express';
import { AdvancedAuditLogger } from './AuditLogger';
import { v4 as uuidv4 } from 'uuid';

export interface AuditContext {
  correlationId: string;
  userId?: string;
  sessionId?: string;
  startTime: number;
}

declare global {
  namespace Express {
    interface Request {
      auditContext?: AuditContext;
    }
  }
}

export class AuditMiddleware {
  private auditLogger: AdvancedAuditLogger;
  private sensitiveHeaders = ['authorization', 'cookie', 'x-api-key'];
  private sensitiveFields = ['password', 'token', 'secret', 'key'];

  constructor(auditLogger: AdvancedAuditLogger) {
    this.auditLogger = auditLogger;
  }

  /**
   * Express middleware for HTTP request auditing
   */
  expressMiddleware() {
    return async (req: Request, res: Response, next: NextFunction) => {
      const startTime = Date.now();
      const correlationId =
        (req.headers['x-correlation-id'] as string) || uuidv4();

      // Set audit context
      req.auditContext = {
        correlationId,
        userId: this.extractUserId(req),
        sessionId: this.extractSessionId(req),
        startTime,
      };

      // Log request initiation
      await this.auditLogger.logEvent({
        correlationId,
        action: 'HTTP_REQUEST_START',
        resource: 'HTTP_ENDPOINT',
        resourceId: `${req.method} ${req.path}`,
        category: 'SYSTEM',
        severity: 'LOW',
        outcome: 'SUCCESS',
        userId: req.auditContext.userId,
        sessionId: req.auditContext.sessionId,
        sourceIP: this.getClientIP(req),
        userAgent: req.get('User-Agent'),
        details: {
          method: req.method,
          url: req.originalUrl,
          headers: this.sanitizeHeaders(req.headers),
          query: req.query,
          body: this.sanitizeBody(req.body),
          contentLength: req.get('Content-Length') || 0,
        },
        tags: ['http', 'request'],
      });

      // Capture response
      const originalSend = res.send;
      const originalJson = res.json;
      const originalEnd = res.end;

      res.send = function (body) {
        captureResponse.call(this, body, 'send');
        return originalSend.call(this, body);
      };

      res.json = function (obj) {
        captureResponse.call(this, obj, 'json');
        return originalJson.call(this, obj);
      };

      res.end = function (chunk, encoding) {
        captureResponse.call(this, chunk, 'end');
        return originalEnd.call(this, chunk, encoding);
      };

      const self = this;
      async function captureResponse(body: any, method: string) {
        const duration = Date.now() - startTime;
        const statusCode = res.statusCode;

        await self.auditLogger.logEvent({
          correlationId,
          action: 'HTTP_REQUEST_END',
          resource: 'HTTP_ENDPOINT',
          resourceId: `${req.method} ${req.path}`,
          category: 'SYSTEM',
          severity: statusCode >= 400 ? 'MEDIUM' : 'LOW',
          outcome: statusCode < 400 ? 'SUCCESS' : 'FAILURE',
          userId: req.auditContext?.userId,
          sessionId: req.auditContext?.sessionId,
          sourceIP: self.getClientIP(req),
          details: {
            method: req.method,
            url: req.originalUrl,
            statusCode,
            responseMethod: method,
            responseSize:
              typeof body === 'string'
                ? body.length
                : JSON.stringify(body || {}).length,
            duration,
            headers: Object.fromEntries(
              Object.entries(res.getHeaders()).filter(
                ([key]) => !self.sensitiveHeaders.includes(key.toLowerCase()),
              ),
            ),
          },
          metadata: {
            duration,
          },
          tags: ['http', 'response'],
        });
      }

      next();
    };
  }

  /**
   * GraphQL operation auditing middleware
   */
  graphqlMiddleware() {
    return {
      requestDidStart: () => ({
        didResolveOperation: async (requestContext: any) => {
          const { request, context } = requestContext;
          const correlationId = context.correlationId || uuidv4();

          await this.auditLogger.logEvent({
            correlationId,
            action: 'GRAPHQL_OPERATION',
            resource: 'GRAPHQL_RESOLVER',
            resourceId: request.operationName || 'anonymous',
            category: 'DATA_ACCESS',
            severity: 'LOW',
            outcome: 'SUCCESS',
            userId: context.user?.id,
            details: {
              operationName: request.operationName,
              operationType: request.query?.match(
                /(query|mutation|subscription)/i,
              )?.[1],
              query: this.sanitizeGraphQLQuery(request.query),
              variables: this.sanitizeObject(request.variables),
              complexity: context.complexity,
            },
            tags: ['graphql', 'operation'],
          });
        },

        willSendResponse: async (requestContext: any) => {
          const { response, context } = requestContext;
          const correlationId = context.correlationId;

          if (response.errors && response.errors.length > 0) {
            await this.auditLogger.logEvent({
              correlationId,
              action: 'GRAPHQL_ERROR',
              resource: 'GRAPHQL_RESOLVER',
              category: 'SYSTEM',
              severity: 'MEDIUM',
              outcome: 'FAILURE',
              userId: context.user?.id,
              details: {
                errors: response.errors.map((error: any) => ({
                  message: error.message,
                  path: error.path,
                  extensions: error.extensions,
                })),
              },
              tags: ['graphql', 'error'],
            });
          }
        },
      }),
    };
  }

  /**
   * Database operation auditing
   */
  databaseMiddleware() {
    return {
      beforeQuery: async (operation: any, context: any) => {
        await this.auditLogger.logEvent({
          correlationId: context.correlationId,
          action: 'DATABASE_QUERY',
          resource: 'DATABASE',
          resourceId: operation.table || 'unknown',
          category: 'DATA_ACCESS',
          severity: this.getDatabaseOperationSeverity(operation.type),
          outcome: 'SUCCESS',
          userId: context.userId,
          details: {
            operation: operation.type,
            table: operation.table,
            conditions: this.sanitizeObject(operation.where),
            affectedFields: operation.select || operation.data,
            transactionId: operation.transactionId,
          },
          tags: ['database', operation.type.toLowerCase()],
        });
      },

      afterQuery: async (operation: any, result: any, context: any) => {
        await this.auditLogger.logEvent({
          correlationId: context.correlationId,
          action: 'DATABASE_QUERY_RESULT',
          resource: 'DATABASE',
          resourceId: operation.table || 'unknown',
          category: 'DATA_ACCESS',
          severity: 'LOW',
          outcome: result.error ? 'FAILURE' : 'SUCCESS',
          userId: context.userId,
          details: {
            operation: operation.type,
            table: operation.table,
            rowCount: result.rowCount || 0,
            error: result.error?.message,
            duration: result.duration,
          },
          metadata: {
            duration: result.duration,
          },
          tags: ['database', 'result'],
        });
      },
    };
  }

  /**
   * Authentication event auditing
   */
  async auditAuthentication(
    action: string,
    userId: string,
    details: Record<string, any> = {},
    outcome: 'SUCCESS' | 'FAILURE' = 'SUCCESS',
  ) {
    await this.auditLogger.logEvent({
      action: `AUTH_${action.toUpperCase()}`,
      resource: 'AUTHENTICATION_SERVICE',
      resourceId: userId,
      category: 'AUTHENTICATION',
      severity: outcome === 'FAILURE' ? 'MEDIUM' : 'LOW',
      outcome,
      userId,
      details: {
        ...details,
        authMethod: details.authMethod || 'unknown',
        mfaEnabled: details.mfaEnabled || false,
      },
      tags: ['authentication', action.toLowerCase()],
    });
  }

  /**
   * Authorization event auditing
   */
  async auditAuthorization(
    action: string,
    resource: string,
    userId: string,
    granted: boolean,
    details: Record<string, any> = {},
  ) {
    await this.auditLogger.logEvent({
      action: `AUTHZ_${action.toUpperCase()}`,
      resource: 'AUTHORIZATION_SERVICE',
      resourceId: resource,
      category: 'AUTHORIZATION',
      severity: granted ? 'LOW' : 'MEDIUM',
      outcome: granted ? 'SUCCESS' : 'FAILURE',
      userId,
      details: {
        ...details,
        requestedAction: action,
        targetResource: resource,
        permissions: details.permissions || [],
        role: details.role,
      },
      tags: ['authorization', granted ? 'granted' : 'denied'],
    });
  }

  /**
   * Data access auditing with privacy controls
   */
  async auditDataAccess(
    action: string,
    resource: string,
    resourceId: string,
    userId: string,
    dataClassification:
      | 'PUBLIC'
      | 'INTERNAL'
      | 'CONFIDENTIAL'
      | 'SECRET' = 'INTERNAL',
    recordCount = 1,
  ) {
    await this.auditLogger.logEvent({
      action: `DATA_${action.toUpperCase()}`,
      resource,
      resourceId,
      category: 'DATA_ACCESS',
      severity: this.getDataAccessSeverity(action, dataClassification),
      outcome: 'SUCCESS',
      userId,
      details: {
        dataClassification,
        recordCount,
        action: action.toLowerCase(),
      },
      tags: [
        'data-access',
        dataClassification.toLowerCase(),
        action.toLowerCase(),
      ],
    });
  }

  /**
   * System configuration change auditing
   */
  async auditConfigChange(
    setting: string,
    oldValue: any,
    newValue: any,
    userId: string,
    details: Record<string, any> = {},
  ) {
    await this.auditLogger.logEvent({
      action: 'CONFIG_CHANGE',
      resource: 'SYSTEM_CONFIGURATION',
      resourceId: setting,
      category: 'CONFIGURATION',
      severity: 'HIGH',
      outcome: 'SUCCESS',
      userId,
      details: {
        ...details,
        setting,
        oldValue: this.sanitizeConfigValue(oldValue),
        newValue: this.sanitizeConfigValue(newValue),
        changeType:
          oldValue === undefined
            ? 'CREATE'
            : newValue === undefined
              ? 'DELETE'
              : 'UPDATE',
      },
      tags: ['configuration', 'change'],
    });
  }

  private extractUserId(req: Request): string | undefined {
    return req.user?.id || (req.headers['x-user-id'] as string);
  }

  private extractSessionId(req: Request): string | undefined {
    return req.session?.id || (req.headers['x-session-id'] as string);
  }

  private getClientIP(req: Request): string {
    return (
      req.ip ||
      req.connection.remoteAddress ||
      (req.headers['x-forwarded-for'] as string) ||
      (req.headers['x-real-ip'] as string) ||
      'unknown'
    );
  }

  private sanitizeHeaders(headers: any): Record<string, any> {
    const sanitized: Record<string, any> = {};
    Object.entries(headers).forEach(([key, value]) => {
      if (!this.sensitiveHeaders.includes(key.toLowerCase())) {
        sanitized[key] = value;
      } else {
        sanitized[key] = '[REDACTED]';
      }
    });
    return sanitized;
  }

  private sanitizeBody(body: any): any {
    if (!body || typeof body !== 'object') return body;
    return this.sanitizeObject(body);
  }

  private sanitizeObject(obj: any): any {
    if (!obj || typeof obj !== 'object') return obj;

    const sanitized: any = Array.isArray(obj) ? [] : {};

    Object.entries(obj).forEach(([key, value]) => {
      if (
        this.sensitiveFields.some((field) => key.toLowerCase().includes(field))
      ) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitizeObject(value);
      } else {
        sanitized[key] = value;
      }
    });

    return sanitized;
  }

  private sanitizeGraphQLQuery(query: string): string {
    // Remove or redact sensitive data from GraphQL queries
    if (!query) return query;

    // Simple regex to redact password fields and similar
    return query
      .replace(/password:\s*"[^"]*"/gi, 'password: "[REDACTED]"')
      .replace(/token:\s*"[^"]*"/gi, 'token: "[REDACTED]"')
      .replace(/secret:\s*"[^"]*"/gi, 'secret: "[REDACTED]"');
  }

  private sanitizeConfigValue(value: any): any {
    if (typeof value === 'string') {
      // Redact values that look like secrets
      if (
        value.match(/^[A-Za-z0-9+/]{20,}={0,2}$/) || // Base64
        value.match(/^[a-f0-9]{32,}$/i) || // Hex strings
        value.toLowerCase().includes('secret') ||
        value.toLowerCase().includes('password') ||
        value.toLowerCase().includes('token')
      ) {
        return '[REDACTED]';
      }
    }
    return value;
  }

  private getDatabaseOperationSeverity(
    operation: string,
  ): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    const operationSeverity: Record<
      string,
      'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
    > = {
      SELECT: 'LOW',
      INSERT: 'MEDIUM',
      UPDATE: 'MEDIUM',
      DELETE: 'HIGH',
      DROP: 'CRITICAL',
      TRUNCATE: 'CRITICAL',
      CREATE: 'HIGH',
      ALTER: 'HIGH',
    };

    return operationSeverity[operation.toUpperCase()] || 'MEDIUM';
  }

  private getDataAccessSeverity(
    action: string,
    classification: string,
  ): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    const baseSeverity =
      {
        READ: 'LOW',
        WRITE: 'MEDIUM',
        DELETE: 'HIGH',
        EXPORT: 'HIGH',
      }[action.toUpperCase()] || 'MEDIUM';

    const classificationMultiplier =
      {
        PUBLIC: 1,
        INTERNAL: 1,
        CONFIDENTIAL: 2,
        SECRET: 3,
      }[classification] || 1;

    const severityLevels = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
    const currentIndex = severityLevels.indexOf(baseSeverity);
    const newIndex = Math.min(
      severityLevels.length - 1,
      currentIndex + classificationMultiplier - 1,
    );

    return severityLevels[newIndex] as 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  }
}

export default AuditMiddleware;
