/**
 * Comprehensive validation schemas and safety checks for mutations
 * Implements defense-in-depth validation with business rule enforcement
 *
 * Security Features:
 * - Input validation with Zod schemas
 * - SQL/Cypher injection prevention
 * - XSS protection
 * - Business rule enforcement
 * - Rate limiting validation
 * - Permission checks
 */

import { z } from 'zod';
import { sanitizeHtml } from '../utils/htmlSanitizer.js';

// Base validation schemas
export const TenantIdSchema = z
  .string()
  .min(1, 'Tenant ID required')
  .regex(
    /^[a-zA-Z0-9_-]+$/,
    'Tenant ID must contain only alphanumeric characters, underscores, and hyphens',
  );

export const EntityIdSchema = z
  .string()
  .min(1, 'Entity ID required')
  .uuid('Entity ID must be a valid UUID');

export const ConfidenceSchema = z
  .number()
  .min(0, 'Confidence must be >= 0')
  .max(1, 'Confidence must be <= 1');

export const TimestampSchema = z
  .string()
  .datetime('Must be a valid ISO datetime')
  .refine(
    (date) => new Date(date) <= new Date(),
    'Timestamp cannot be in the future',
  );

// Entity validation
export const EntityKindSchema = z
  .string()
  .min(1, 'Entity kind required')
  .max(50, 'Entity kind too long')
  .regex(
    /^[a-zA-Z][a-zA-Z0-9_]*$/,
    'Entity kind must start with letter and contain only alphanumeric and underscores',
  );

export const EntityLabelsSchema = z
  .array(z.string())
  .max(20, 'Maximum 20 labels allowed')
  .refine(
    (labels) => new Set(labels).size === labels.length,
    'Duplicate labels not allowed',
  );

export const EntityPropsSchema = z
  .record(z.any())
  .refine(
    (props) => JSON.stringify(props).length <= 32768,
    'Entity properties too large (max 32KB)',
  )
  .refine(
    (props) => !props.hasOwnProperty('id') && !props.hasOwnProperty('tenantId'),
    'Reserved property names not allowed in props',
  );

// Relationship validation
export const RelationshipTypeSchema = z
  .string()
  .min(1, 'Relationship type required')
  .max(100, 'Relationship type too long')
  .regex(
    /^[A-Z][A-Z0-9_]*$/,
    'Relationship type must be uppercase with underscores',
  );

// Investigation validation
export const InvestigationNameSchema = z
  .string()
  .min(1, 'Investigation name required')
  .max(200, 'Investigation name too long')
  .refine(
    (name) => !name.includes('<') && !name.includes('>'),
    'Investigation name cannot contain HTML tags',
  );

export const InvestigationStatusSchema = z.enum([
  'ACTIVE',
  'ARCHIVED',
  'COMPLETED',
  'DRAFT',
]);

// Custom metadata validation
export const CustomMetadataSchema = z
  .record(z.any())
  .refine(
    (metadata) => JSON.stringify(metadata).length <= 16384,
    'Custom metadata too large (max 16KB)',
  )
  .refine((metadata) => {
    // Check for potentially dangerous content
    const str = JSON.stringify(metadata);
    const dangerousPatterns = [
      /<script/i,
      /javascript:/i,
      /on\w+\s*=/i,
      /data:.*base64/i,
    ];
    return !dangerousPatterns.some((pattern) => pattern.test(str));
  }, 'Custom metadata contains potentially dangerous content');

// Budget and cost validation
export const BudgetLimitSchema = z
  .number()
  .positive('Budget limit must be positive')
  .max(1000000, 'Budget limit too high (max $1M)');

export const CostEstimateSchema = z
  .number()
  .nonnegative('Cost estimate cannot be negative')
  .max(10000, 'Cost estimate too high (max $10K per operation)');

// Token count validation
export const TokenCountSchema = z
  .number()
  .int('Token count must be an integer')
  .nonnegative('Token count cannot be negative')
  .max(2000000, 'Token count too high (max 2M tokens)');

// Business rule validators
export class BusinessRuleValidator {
  /**
   * Validates entity creation against business rules
   */
  static validateEntityCreation(
    entity: any,
    context: any,
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check entity count limits per investigation
    if (entity.investigationId && context.entityCount >= 50000) {
      errors.push('Investigation has reached maximum entity limit (50,000)');
    }

    // Check for suspicious entity patterns
    if (entity.kind === 'IP' && entity.props.address) {
      const ip = entity.props.address;
      if (
        ip.startsWith('127.') ||
        ip.startsWith('169.254.') ||
        ip.startsWith('10.')
      ) {
        // These might be internal IPs - warn but don't block
        context.warnings = context.warnings || [];
        context.warnings.push('Entity represents internal IP address');
      }
    }

    // Validate entity kind permissions
    const restrictedKinds = ['CLASSIFIED', 'PII', 'FINANCIAL'];
    if (
      restrictedKinds.includes(entity.kind) &&
      !context.user.permissions.includes('entity:sensitive')
    ) {
      errors.push(`Insufficient permissions for entity kind: ${entity.kind}`);
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Validates relationship creation against business rules
   */
  static validateRelationshipCreation(
    relationship: any,
    context: any,
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Prevent self-referential relationships
    if (relationship.srcId === relationship.dstId) {
      errors.push('Self-referential relationships not allowed');
    }

    // Check relationship count limits
    if (context.relationshipCount >= 100000) {
      errors.push(
        'Investigation has reached maximum relationship limit (100,000)',
      );
    }

    // Validate high-confidence relationships
    if (relationship.confidence > 0.9 && relationship.source === 'automated') {
      if (!context.user.permissions.includes('relationship:high_confidence')) {
        errors.push(
          'Insufficient permissions for high-confidence automated relationships',
        );
      }
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Validates investigation operations
   */
  static validateInvestigationOperation(
    investigation: any,
    operation: string,
    context: any,
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check investigation limits per tenant
    if (operation === 'create' && context.investigationCount >= 1000) {
      errors.push('Tenant has reached maximum investigation limit (1,000)');
    }

    // Validate status transitions
    if (operation === 'update' && investigation.status) {
      const validTransitions: Record<string, string[]> = {
        DRAFT: ['ACTIVE'],
        ACTIVE: ['COMPLETED', 'ARCHIVED'],
        COMPLETED: ['ACTIVE', 'ARCHIVED'],
        ARCHIVED: ['ACTIVE'],
      };

      const currentStatus = context.currentStatus;
      if (
        currentStatus &&
        !validTransitions[currentStatus]?.includes(investigation.status)
      ) {
        errors.push(
          `Invalid status transition from ${currentStatus} to ${investigation.status}`,
        );
      }
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Validates token usage against budgets and limits
   */
  static validateTokenUsage(
    tokens: number,
    context: any,
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check per-request token limit
    const maxTokensPerRequest = Number(
      process.env.MAX_TOKENS_PER_REQUEST || 500000,
    );
    if (tokens > maxTokensPerRequest) {
      errors.push(
        `Token count exceeds per-request limit: ${tokens} > ${maxTokensPerRequest}`,
      );
    }

    // Check daily token budget for user
    if (context.dailyTokenUsage + tokens > context.dailyTokenBudget) {
      errors.push('Request would exceed daily token budget');
    }

    // Check tenant-level limits
    if (context.tenantTokenUsage + tokens > context.tenantTokenBudget) {
      errors.push('Request would exceed tenant token budget');
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Validates bulk operations
   */
  static validateBulkOperation(
    items: any[],
    operation: string,
    context: any,
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check bulk operation limits
    const maxBulkSize = operation === 'entity' ? 1000 : 500;
    if (items.length > maxBulkSize) {
      errors.push(`Bulk operation too large: ${items.length} > ${maxBulkSize}`);
    }

    // Check for rate limiting
    const currentHour = new Date().getHours();
    const bulkOpsThisHour = context.bulkOperationsThisHour || 0;
    if (bulkOpsThisHour >= 100) {
      errors.push('Hourly bulk operation limit exceeded (100)');
    }

    // Validate unique items in bulk
    if (operation === 'entity') {
      const seen = new Set();
      for (const item of items) {
        const key = `${item.kind}:${JSON.stringify(item.props)}`;
        if (seen.has(key)) {
          errors.push('Duplicate items detected in bulk operation');
          break;
        }
        seen.add(key);
      }
    }

    return { valid: errors.length === 0, errors };
  }
}

// Rate limiting validators
export class RateLimitValidator {
  private static operations: Map<string, number[]> = new Map();

  /**
   * Check rate limit for a specific operation
   */
  static checkRateLimit(
    key: string,
    maxOperations: number,
    windowMs: number,
  ): { allowed: boolean; resetTime?: number } {
    const now = Date.now();
    const windowStart = now - windowMs;

    // Get existing operations for this key
    let timestamps = this.operations.get(key) || [];

    // Remove old timestamps outside the window
    timestamps = timestamps.filter((ts) => ts > windowStart);

    // Check if we're within the limit
    if (timestamps.length >= maxOperations) {
      const resetTime = timestamps[0] + windowMs;
      return { allowed: false, resetTime };
    }

    // Add current operation
    timestamps.push(now);
    this.operations.set(key, timestamps);

    return { allowed: true };
  }

  /**
   * Get rate limit status
   */
  static getRateLimitStatus(key: string, windowMs: number) {
    const now = Date.now();
    const windowStart = now - windowMs;
    const timestamps = this.operations.get(key) || [];
    const recentOperations = timestamps.filter((ts) => ts > windowStart);

    return {
      operations: recentOperations.length,
      oldestOperation:
        recentOperations.length > 0 ? Math.min(...recentOperations) : null,
      windowStart,
      windowEnd: now,
    };
  }
}

// Security validators
export class SecurityValidator {
  /**
   * Validate input for potential security issues
   */
  static validateInput(input: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Convert to string for pattern matching
    const inputStr = typeof input === 'string' ? input : JSON.stringify(input);

    // Check for potential injection attacks
    const sqlInjectionPatterns = [
      /(\bSELECT\b.*\bFROM\b)/i,
      /(\bUNION\b.*\bSELECT\b)/i,
      /(\bDROP\b.*\bTABLE\b)/i,
      /(\bINSERT\b.*\bINTO\b)/i,
    ];

    const cypherInjectionPatterns = [
      /(\bMATCH\b.*\bRETURN\b)/i,
      /(\bCREATE\b.*\bNODE\b)/i,
      /(\bDELETE\b.*\bNODE\b)/i,
    ];

    const xssPatterns = [
      /<script[^>]*>.*?<\/script>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
    ];

    if (sqlInjectionPatterns.some((pattern) => pattern.test(inputStr))) {
      errors.push('Potential SQL injection detected');
    }

    if (cypherInjectionPatterns.some((pattern) => pattern.test(inputStr))) {
      errors.push('Potential Cypher injection detected');
    }

    if (xssPatterns.some((pattern) => pattern.test(inputStr))) {
      errors.push('Potential XSS content detected');
    }

    // Check for excessively long inputs (potential DoS)
    if (inputStr.length > 1048576) {
      // 1MB limit
      errors.push('Input size too large');
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Validate user permissions for operation
   */
  static validatePermissions(
    user: any,
    operation: string,
    resource: string,
    context?: any,
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check if user has wildcard permission
    if (user.permissions.includes('*')) {
      return { valid: true, errors: [] };
    }

    // Check specific permission
    const requiredPermission = `${resource}:${operation}`;
    if (!user.permissions.includes(requiredPermission)) {
      errors.push(`Missing permission: ${requiredPermission}`);
    }

    // Check tenant isolation
    if (context?.tenantId && context.tenantId !== user.tenantId) {
      errors.push('Cross-tenant access not allowed');
    }

    return { valid: errors.length === 0, errors };
  }
}

// Additional comprehensive validation schemas

/**
 * Email validation with strict rules
 */
export const EmailSchema = z
  .string()
  .email('Invalid email format')
  .min(5, 'Email too short')
  .max(254, 'Email too long') // RFC 5321
  .toLowerCase()
  .refine(
    (email) => !email.includes('..'),
    'Email cannot contain consecutive dots'
  );

/**
 * URL validation with protocol restrictions
 */
export const URLSchema = z
  .string()
  .url('Invalid URL format')
  .refine(
    (url) => {
      try {
        const parsed = new URL(url);
        return ['http:', 'https:'].includes(parsed.protocol);
      } catch {
        return false;
      }
    },
    'Only HTTP/HTTPS protocols allowed'
  )
  .refine(
    (url) => !url.includes('localhost') && !url.includes('127.0.0.1'),
    'Local URLs not allowed in production'
  );

/**
 * Pagination parameters validation
 */
export const PaginationSchema = z.object({
  limit: z
    .number()
    .int('Limit must be an integer')
    .min(1, 'Limit must be at least 1')
    .max(1000, 'Limit cannot exceed 1000')
    .default(20),
  offset: z
    .number()
    .int('Offset must be an integer')
    .min(0, 'Offset cannot be negative')
    .default(0),
  cursor: z.string().optional(),
});

/**
 * Search query validation
 */
export const SearchQuerySchema = z
  .string()
  .min(1, 'Search query required')
  .max(500, 'Search query too long')
  .refine(
    (query) => {
      // Prevent query injection patterns
      const dangerousPatterns = [
        /[<>]/g, // HTML tags
        /javascript:/i, // JS protocol
        /on\w+\s*=/i, // Event handlers
      ];
      return !dangerousPatterns.some((pattern) => pattern.test(query));
    },
    'Search query contains invalid characters'
  );

/**
 * File upload validation
 */
export const FileUploadSchema = z.object({
  filename: z
    .string()
    .min(1, 'Filename required')
    .max(255, 'Filename too long')
    .refine(
      (name) => /^[a-zA-Z0-9_.-]+$/.test(name),
      'Filename contains invalid characters'
    ),
  mimeType: z
    .string()
    .refine(
      (type) => {
        const allowedTypes = [
          'image/jpeg',
          'image/png',
          'image/gif',
          'application/pdf',
          'text/plain',
          'application/json',
        ];
        return allowedTypes.includes(type);
      },
      'File type not allowed'
    ),
  size: z
    .number()
    .int('File size must be an integer')
    .min(1, 'File cannot be empty')
    .max(10 * 1024 * 1024, 'File size exceeds 10MB limit'),
});

/**
 * IP Address validation
 */
export const IPAddressSchema = z
  .string()
  .refine(
    (ip) => {
      // IPv4 regex
      const ipv4Pattern =
        /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
      // IPv6 regex (simplified)
      const ipv6Pattern =
        /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4})$/;
      return ipv4Pattern.test(ip) || ipv6Pattern.test(ip);
    },
    'Invalid IP address format'
  );

/**
 * Phone number validation (international format)
 */
export const PhoneNumberSchema = z
  .string()
  .regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format (E.164)');

/**
 * Date range validation
 */
export const DateRangeSchema = z
  .object({
    startDate: TimestampSchema,
    endDate: TimestampSchema,
  })
  .refine(
    (data) => new Date(data.startDate) < new Date(data.endDate),
    'End date must be after start date'
  )
  .refine(
    (data) => {
      const start = new Date(data.startDate);
      const end = new Date(data.endDate);
      const diffDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
      return diffDays <= 365; // Max 1 year range
    },
    'Date range cannot exceed 365 days'
  );

/**
 * Comprehensive GraphQL input validation
 */
export const GraphQLInputSchema = z.object({
  operationName: z.string().max(100, 'Operation name too long').optional(),
  query: z
    .string()
    .min(1, 'Query required')
    .max(50000, 'Query too large')
    .refine(
      (query) => {
        // Count query depth (simple heuristic)
        const openBraces = (query.match(/{/g) || []).length;
        return openBraces <= 15; // Max depth of 15
      },
      'Query depth exceeds maximum allowed'
    ),
  variables: z.record(z.any()).optional(),
});

/**
 * Sanitization utilities
 */
export class SanitizationUtils {
  /**
   * Sanitize HTML to prevent XSS
   */
  static sanitizeHTML(input: string): string {
    return sanitizeHtml(String(input));
  }

  /**
   * Sanitize SQL input (for dynamic queries - prefer parameterized queries!)
   */
  static sanitizeSQL(input: string): string {
    return input
      .replace(/'/g, "''") // Escape single quotes
      .replace(/;/g, '') // Remove semicolons
      .replace(/--/g, '') // Remove SQL comments
      .replace(/\/\*/g, '') // Remove block comments
      .replace(/\*\//g, '');
  }

  /**
   * Sanitize Cypher input (for dynamic queries - prefer parameterized queries!)
   */
  static sanitizeCypher(input: string): string {
    return input
      .replace(/'/g, "\\'") // Escape single quotes
      .replace(/"/g, '\\"') // Escape double quotes
      .replace(/`/g, '\\`') // Escape backticks
      .replace(/\\/g, '\\\\'); // Escape backslashes
  }

  /**
   * Sanitize user input for safe storage and display
   */
  static sanitizeUserInput(input: any): any {
    if (typeof input === 'string') {
      return this.sanitizeHTML(input).trim().slice(0, 10000); // Max 10KB
    }
    if (Array.isArray(input)) {
      return input.slice(0, 1000).map((item) => this.sanitizeUserInput(item));
    }
    if (input && typeof input === 'object') {
      const sanitized: Record<string, any> = {};
      for (const [key, value] of Object.entries(input)) {
        if (Object.keys(sanitized).length >= 100) break; // Max 100 keys
        sanitized[key] = this.sanitizeUserInput(value);
      }
      return sanitized;
    }
    return input;
  }

  /**
   * Remove potentially dangerous content from strings
   */
  static removeDangerousContent(input: string): string {
    return input
      .replace(/<script[^>]*>.*?<\/script>/gi, '') // Remove script tags
      .replace(/<iframe[^>]*>.*?<\/iframe>/gi, '') // Remove iframes
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/on\w+\s*=/gi, '') // Remove event handlers
      .replace(/data:.*base64/gi, ''); // Remove base64 data URIs
  }
}

/**
 * Query validation utilities
 */
export class QueryValidator {
  /**
   * Validate that a query uses parameterized inputs (not string interpolation)
   */
  static isParameterized(query: string, params: Record<string, any>): boolean {
    // Check that all params are referenced in query with $ syntax
    const paramKeys = Object.keys(params);
    const queryParams = query.match(/\$\w+/g) || [];
    const uniqueQueryParams = [...new Set(queryParams.map((p) => p.slice(1)))];

    // All params should be used in query
    return paramKeys.every((key) => uniqueQueryParams.includes(key));
  }

  /**
   * Check for dangerous SQL patterns (defense in depth)
   */
  static hasDangerousSQLPatterns(query: string): boolean {
    const dangerousPatterns = [
      /;\s*(DROP|DELETE|TRUNCATE|ALTER)/i,
      /UNION\s+SELECT/i,
      /exec\s*\(/i,
      /execute\s*\(/i,
      /xp_cmdshell/i,
    ];
    return dangerousPatterns.some((pattern) => pattern.test(query));
  }

  /**
   * Check for dangerous Cypher patterns
   */
  static hasDangerousCypherPatterns(query: string): boolean {
    const dangerousPatterns = [
      /;\s*(DROP|DELETE\s+.*\s+DETACH)/i,
      /CALL\s+dbms\./i,
      /CALL\s+db\./i,
      /apoc\.cypher\.run/i,
    ];
    return dangerousPatterns.some((pattern) => pattern.test(query));
  }

  /**
   * Validate Cypher query safety
   */
  static validateCypherQuery(
    query: string,
    params: Record<string, any>
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (this.hasDangerousCypherPatterns(query)) {
      errors.push('Query contains potentially dangerous Cypher patterns');
    }

    if (!this.isParameterized(query, params)) {
      errors.push('Query must use parameterized inputs ($param syntax)');
    }

    if (query.length > 100000) {
      errors.push('Query exceeds maximum length');
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Validate SQL query safety
   */
  static validateSQLQuery(
    query: string,
    params: any[]
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (this.hasDangerousSQLPatterns(query)) {
      errors.push('Query contains potentially dangerous SQL patterns');
    }

    if (query.length > 100000) {
      errors.push('Query exceeds maximum length');
    }

    const placeholderCount = (query.match(/\?/g) || []).length;
    if (placeholderCount !== params.length) {
      errors.push('Parameter count mismatch');
    }

    return { valid: errors.length === 0, errors };
  }
}
