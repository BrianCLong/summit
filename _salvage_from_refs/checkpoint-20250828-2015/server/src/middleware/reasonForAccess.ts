import { Request, Response, NextFunction } from 'express';
import { GraphQLFieldResolver, GraphQLResolveInfo } from 'graphql';
import { createHash } from 'crypto';
import { Redis } from 'ioredis';

interface AccessContext {
  userId: string;
  tenantId: string;
  sessionId: string;
  investigationId?: string;
  caseId?: string;
  reasonForAccess: string;
  accessLevel: 'read' | 'write' | 'export' | 'admin';
  timestamp: Date;
  clientInfo: {
    ip: string;
    userAgent: string;
    location?: string;
  };
  metadata?: Record<string, any>;
}

interface ReasonValidationRules {
  minLength: number;
  maxLength: number;
  requiredKeywords: string[];
  forbiddenPatterns: RegExp[];
  validCategories: string[];
}

/**
 * Reason-for-Access Middleware and Context Manager
 * Enforces reason-for-access requirements across all sensitive operations
 */
export class ReasonForAccessManager {
  private redis: Redis;
  private validationRules: ReasonValidationRules;
  
  // Operations requiring reason-for-access
  private readonly PROTECTED_OPERATIONS = new Set([
    'export',
    'investigation.create',
    'investigation.update',
    'case.create',
    'case.update',
    'entity.merge',
    'relationship.create',
    'alert.acknowledge',
    'alert.escalate',
    'user.roleChange',
    'system.backup',
    'audit.access'
  ]);

  // Access level requirements by operation
  private readonly ACCESS_REQUIREMENTS = new Map([
    ['export', 'export'],
    ['investigation.create', 'write'],
    ['investigation.update', 'write'],
    ['case.create', 'write'],
    ['case.update', 'write'],
    ['entity.merge', 'write'],
    ['relationship.create', 'write'],
    ['alert.acknowledge', 'write'],
    ['alert.escalate', 'write'],
    ['user.roleChange', 'admin'],
    ['system.backup', 'admin'],
    ['audit.access', 'read']
  ]);

  constructor(redis: Redis) {
    this.redis = redis;
    this.validationRules = {
      minLength: 10,
      maxLength: 500,
      requiredKeywords: [],
      forbiddenPatterns: [
        /test|testing|dummy/i,
        /no\s*reason|none|n\/a/i,
        /just\s*because|random/i
      ],
      validCategories: [
        'investigation',
        'threat_analysis',
        'compliance_audit',
        'incident_response',
        'intelligence_gathering',
        'case_management',
        'system_maintenance',
        'training_exercise',
        'quality_assurance'
      ]
    };
  }

  /**
   * Express middleware to enforce reason-for-access
   */
  requireReasonForAccess = (operations: string[] = []) => {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        // Extract operation from request
        const operation = this.extractOperation(req);
        
        // Check if operation requires reason
        if (!this.requiresReason(operation, operations)) {
          return next();
        }

        // Get reason from headers or body
        const reason = req.headers['x-reason-for-access'] as string ||
                      req.body?.reasonForAccess ||
                      req.query?.reasonForAccess as string;

        if (!reason) {
          return res.status(400).json({
            error: 'REASON_REQUIRED',
            message: `Operation '${operation}' requires reason-for-access`,
            operation
          });
        }

        // Validate reason
        const validation = await this.validateReason(reason, operation);
        if (!validation.valid) {
          return res.status(400).json({
            error: 'INVALID_REASON',
            message: validation.message,
            operation,
            requirements: this.getReasonRequirements(operation)
          });
        }

        // Create access context
        const accessContext = await this.createAccessContext(req, reason, operation);
        
        // Store in request for downstream use
        req.accessContext = accessContext;
        
        // Log access attempt
        await this.logAccessAttempt(accessContext, operation);
        
        next();

      } catch (error) {
        console.error('Reason-for-access middleware error:', error);
        res.status(500).json({
          error: 'ACCESS_VALIDATION_ERROR',
          message: 'Failed to validate access context'
        });
      }
    };
  };

  /**
   * GraphQL directive resolver for @requireReason
   */
  requireReasonDirective = (resolver: GraphQLFieldResolver<any, any>) => {
    return async (parent: any, args: any, context: any, info: GraphQLResolveInfo) => {
      const operation = `${info.parentType.name}.${info.fieldName}`;
      
      // Check if operation requires reason
      if (!this.requiresReason(operation)) {
        return resolver(parent, args, context, info);
      }

      // Get reason from GraphQL context
      const reason = context.reasonForAccess || args.reasonForAccess;
      
      if (!reason) {
        throw new Error(`Operation '${operation}' requires reason-for-access`);
      }

      // Validate reason
      const validation = await this.validateReason(reason, operation);
      if (!validation.valid) {
        throw new Error(`Invalid reason: ${validation.message}`);
      }

      // Create access context
      const accessContext = await this.createAccessContext(context.req, reason, operation);
      
      // Add to GraphQL context
      context.accessContext = accessContext;
      
      // Log access attempt
      await this.logAccessAttempt(accessContext, operation);
      
      return resolver(parent, args, context, info);
    };
  };

  /**
   * Validate reason-for-access string
   */
  async validateReason(reason: string, operation?: string): Promise<{
    valid: boolean;
    message?: string;
    score: number;
  }> {
    if (!reason || typeof reason !== 'string') {
      return { valid: false, message: 'Reason must be a non-empty string', score: 0 };
    }

    const trimmed = reason.trim();
    
    // Length validation
    if (trimmed.length < this.validationRules.minLength) {
      return { 
        valid: false, 
        message: `Reason too short (min ${this.validationRules.minLength} characters)`,
        score: 0
      };
    }

    if (trimmed.length > this.validationRules.maxLength) {
      return { 
        valid: false, 
        message: `Reason too long (max ${this.validationRules.maxLength} characters)`,
        score: 0
      };
    }

    // Forbidden pattern check
    for (const pattern of this.validationRules.forbiddenPatterns) {
      if (pattern.test(trimmed)) {
        return { 
          valid: false, 
          message: 'Reason contains invalid patterns or generic text',
          score: 0
        };
      }
    }

    // Calculate quality score
    let score = this.calculateReasonScore(trimmed, operation);
    
    // Minimum score threshold
    if (score < 0.6) {
      return {
        valid: false,
        message: 'Reason quality insufficient - provide more specific justification',
        score
      };
    }

    return { valid: true, score };
  }

  /**
   * Calculate reason quality score (0-1)
   */
  private calculateReasonScore(reason: string, operation?: string): number {
    let score = 0.5; // Base score
    
    // Length bonus
    const words = reason.split(/\s+/).length;
    score += Math.min(words / 20, 0.2); // Up to 20% for word count
    
    // Category keywords
    const categoryKeywords = [
      'investigation', 'threat', 'incident', 'compliance', 
      'audit', 'analysis', 'intelligence', 'case', 'evidence'
    ];
    const foundCategories = categoryKeywords.filter(keyword => 
      reason.toLowerCase().includes(keyword)
    );
    score += foundCategories.length * 0.1; // 10% per category keyword
    
    // Specific identifiers (case IDs, investigation IDs, etc.)
    const idPatterns = [
      /case[#\s-]*\w+/i,
      /investigation[#\s-]*\w+/i,
      /incident[#\s-]*\w+/i,
      /ticket[#\s-]*\w+/i
    ];
    const hasIdentifiers = idPatterns.some(pattern => pattern.test(reason));
    if (hasIdentifiers) score += 0.15;
    
    // Operation relevance
    if (operation) {
      const operationWords = operation.split(/[._]/).map(w => w.toLowerCase());
      const reasonWords = reason.toLowerCase().split(/\s+/);
      const relevantWords = operationWords.filter(ow => 
        reasonWords.some(rw => rw.includes(ow) || ow.includes(rw))
      );
      score += relevantWords.length * 0.05; // 5% per relevant word
    }
    
    return Math.min(score, 1.0);
  }

  /**
   * Create comprehensive access context
   */
  private async createAccessContext(
    req: any, 
    reason: string, 
    operation: string
  ): Promise<AccessContext> {
    const userId = req.user?.id || req.headers['x-user-id'];
    const tenantId = req.tenant?.id || req.headers['x-tenant-id'] || 'default';
    const sessionId = req.session?.id || req.headers['x-session-id'] || 'unknown';
    
    return {
      userId,
      tenantId,
      sessionId,
      investigationId: req.headers['x-investigation-id'] || req.body?.investigationId,
      caseId: req.headers['x-case-id'] || req.body?.caseId,
      reasonForAccess: reason,
      accessLevel: this.ACCESS_REQUIREMENTS.get(operation) || 'read',
      timestamp: new Date(),
      clientInfo: {
        ip: req.ip || req.connection?.remoteAddress || 'unknown',
        userAgent: req.headers['user-agent'] || 'unknown',
        location: req.headers['x-client-location']
      },
      metadata: {
        operation,
        requestId: req.headers['x-request-id'],
        correlation: req.headers['x-correlation-id']
      }
    };
  }

  /**
   * Log access attempt with full context
   */
  private async logAccessAttempt(context: AccessContext, operation: string): Promise<void> {
    const logEntry = {
      ...context,
      operation,
      id: this.generateAccessId(context, operation),
      createdAt: new Date().toISOString()
    };

    // Store in Redis for fast access
    const key = `access_log:${context.tenantId}:${context.userId}`;
    await this.redis.lpush(key, JSON.stringify(logEntry));
    await this.redis.ltrim(key, 0, 999); // Keep last 1000 entries
    await this.redis.expire(key, 30 * 24 * 60 * 60); // 30 days

    // Store in time-series for audit
    const auditKey = `audit:access:${new Date().toISOString().substring(0, 10)}`; // Daily buckets
    await this.redis.zadd(auditKey, Date.now(), JSON.stringify(logEntry));
    await this.redis.expire(auditKey, 365 * 24 * 60 * 60); // 1 year retention

    // Real-time access monitoring
    await this.redis.publish('access_events', JSON.stringify({
      type: 'access_attempt',
      operation,
      userId: context.userId,
      tenantId: context.tenantId,
      reason: context.reasonForAccess,
      timestamp: context.timestamp.toISOString()
    }));
  }

  /**
   * Extract operation name from request
   */
  private extractOperation(req: Request): string {
    // GraphQL operations
    if (req.body?.query) {
      const match = req.body.query.match(/^\s*(query|mutation)\s+(\w+)/);
      if (match) return match[2];
    }

    // REST operations
    const method = req.method.toLowerCase();
    const path = req.path.toLowerCase();
    
    if (path.includes('/export')) return 'export';
    if (path.includes('/investigation')) return `investigation.${method}`;
    if (path.includes('/case')) return `case.${method}`;
    if (path.includes('/entity')) return `entity.${method}`;
    if (path.includes('/alert')) return `alert.${method}`;
    
    return `${method}:${path}`;
  }

  /**
   * Check if operation requires reason
   */
  private requiresReason(operation: string, additionalOps: string[] = []): boolean {
    return this.PROTECTED_OPERATIONS.has(operation) || 
           additionalOps.includes(operation) ||
           operation.includes('export') ||
           operation.includes('admin');
  }

  /**
   * Get reason requirements for operation
   */
  private getReasonRequirements(operation: string): {
    minLength: number;
    maxLength: number;
    suggestions: string[];
    examples: string[];
  } {
    const suggestions = [
      'Reference specific case or investigation ID',
      'Explain business justification',
      'Include compliance or regulatory requirement',
      'Specify analysis goals or objectives'
    ];

    const examples = [
      'Investigating Case-2024-001 threat actor attribution',
      'Compliance audit for SOC2 certification requirement',
      'Intelligence analysis for Operation NIGHTOWL',
      'Incident response for security alert IR-2024-0456'
    ];

    return {
      minLength: this.validationRules.minLength,
      maxLength: this.validationRules.maxLength,
      suggestions,
      examples
    };
  }

  /**
   * Generate unique access ID
   */
  private generateAccessId(context: AccessContext, operation: string): string {
    const content = `${context.userId}-${context.tenantId}-${operation}-${context.timestamp.toISOString()}`;
    return createHash('sha256').update(content).digest('hex').substring(0, 16);
  }

  /**
   * Get access history for user
   */
  async getAccessHistory(
    tenantId: string, 
    userId: string, 
    limit = 100
  ): Promise<AccessContext[]> {
    const key = `access_log:${tenantId}:${userId}`;
    const entries = await this.redis.lrange(key, 0, limit - 1);
    return entries.map(entry => JSON.parse(entry));
  }

  /**
   * Search access logs by criteria
   */
  async searchAccessLogs(criteria: {
    tenantId: string;
    userId?: string;
    operation?: string;
    dateFrom?: Date;
    dateTo?: Date;
    reasonContains?: string;
  }): Promise<AccessContext[]> {
    const results: AccessContext[] = [];
    
    // Get date range keys
    const dateFrom = criteria.dateFrom || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const dateTo = criteria.dateTo || new Date();
    
    const dates = this.getDateRange(dateFrom, dateTo);
    
    for (const date of dates) {
      const key = `audit:access:${date}`;
      const entries = await this.redis.zrangebyscore(
        key, 
        dateFrom.getTime(), 
        dateTo.getTime()
      );
      
      entries.forEach(entry => {
        const log = JSON.parse(entry);
        
        // Apply filters
        if (criteria.userId && log.userId !== criteria.userId) return;
        if (criteria.operation && log.operation !== criteria.operation) return;
        if (criteria.reasonContains && 
            !log.reasonForAccess.toLowerCase().includes(criteria.reasonContains.toLowerCase())) return;
        
        results.push(log);
      });
    }
    
    return results.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }

  /**
   * Generate date range for search
   */
  private getDateRange(from: Date, to: Date): string[] {
    const dates: string[] = [];
    const current = new Date(from);
    
    while (current <= to) {
      dates.push(current.toISOString().substring(0, 10));
      current.setDate(current.getDate() + 1);
    }
    
    return dates;
  }
}

// Augment Request type
declare global {
  namespace Express {
    interface Request {
      accessContext?: AccessContext;
    }
  }
}

export { AccessContext, ReasonForAccessManager };