/**
 * @fileoverview Comprehensive API Validation Layer
 *
 * Production-grade validation system implementing:
 * - Zod-based schema validation
 * - Request/Response validation middleware
 * - GraphQL input validation
 * - Custom validators for domain-specific types
 * - Sanitization and normalization
 * - Validation error formatting
 *
 * @module validation/ApiValidationLayer
 */

import { z, ZodError, ZodSchema, ZodType } from 'zod';
import { Request, Response, NextFunction } from 'express';
import { ValidationError } from '../errors/ErrorHandlingFramework.js';

// ============================================================================
// Core Validation Types
// ============================================================================

/**
 * Validation result type
 */
export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  errors?: Array<{
    field: string;
    message: string;
    code: string;
    value?: unknown;
  }>;
}

/**
 * Validation options
 */
export interface ValidationOptions {
  /** Strip unknown keys from objects */
  stripUnknown?: boolean;
  /** Abort on first error */
  abortEarly?: boolean;
  /** Custom error messages */
  messages?: Record<string, string>;
  /** Sanitize input before validation */
  sanitize?: boolean;
}

// ============================================================================
// Custom Zod Types for IntelGraph Domain
// ============================================================================

/**
 * UUID validation
 */
export const zodUUID = z.string().uuid({ message: 'Invalid UUID format' });

/**
 * Email validation with additional checks
 */
export const zodEmail = z
  .string()
  .email({ message: 'Invalid email format' })
  .min(5, { message: 'Email must be at least 5 characters' })
  .max(254, { message: 'Email must not exceed 254 characters' })
  .transform((email) => email.toLowerCase().trim());

/**
 * Strong password validation
 */
export const zodPassword = z
  .string()
  .min(12, { message: 'Password must be at least 12 characters' })
  .max(128, { message: 'Password must not exceed 128 characters' })
  .regex(/[A-Z]/, { message: 'Password must contain at least one uppercase letter' })
  .regex(/[a-z]/, { message: 'Password must contain at least one lowercase letter' })
  .regex(/[0-9]/, { message: 'Password must contain at least one number' })
  .regex(/[^A-Za-z0-9]/, { message: 'Password must contain at least one special character' });

/**
 * Username validation
 */
export const zodUsername = z
  .string()
  .min(3, { message: 'Username must be at least 3 characters' })
  .max(50, { message: 'Username must not exceed 50 characters' })
  .regex(/^[a-zA-Z0-9_-]+$/, {
    message: 'Username can only contain letters, numbers, underscores, and hyphens',
  })
  .transform((username) => username.toLowerCase());

/**
 * Pagination parameters
 */
export const zodPagination = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

/**
 * Date range validation
 */
export const zodDateRange = z
  .object({
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
  })
  .refine((data) => data.startDate <= data.endDate, {
    message: 'Start date must be before or equal to end date',
    path: ['startDate'],
  });

/**
 * Search query validation
 */
export const zodSearchQuery = z
  .string()
  .min(1, { message: 'Search query cannot be empty' })
  .max(500, { message: 'Search query too long' })
  .transform((query) => query.trim());

/**
 * Entity type enum
 */
export const EntityType = z.enum([
  'PERSON',
  'ORGANIZATION',
  'LOCATION',
  'EVENT',
  'DOCUMENT',
  'ASSET',
  'COMMUNICATION',
  'TRANSACTION',
  'ARTIFACT',
  'UNKNOWN',
]);

/**
 * Relationship type enum
 */
export const RelationshipType = z.enum([
  'KNOWS',
  'WORKS_FOR',
  'OWNS',
  'LOCATED_AT',
  'PARTICIPATED_IN',
  'RELATED_TO',
  'COMMUNICATES_WITH',
  'TRANSACTED_WITH',
  'AUTHORED',
  'MENTIONED_IN',
]);

/**
 * User role enum
 */
export const UserRole = z.enum([
  'ADMIN',
  'ANALYST',
  'VIEWER',
  'INVESTIGATOR',
  'MANAGER',
  'AUDITOR',
]);

/**
 * Investigation status enum
 */
export const InvestigationStatus = z.enum([
  'DRAFT',
  'ACTIVE',
  'ON_HOLD',
  'COMPLETED',
  'ARCHIVED',
  'DELETED',
]);

// ============================================================================
// Domain Schemas
// ============================================================================

/**
 * User registration schema
 */
export const UserRegistrationSchema = z.object({
  email: zodEmail,
  username: zodUsername,
  password: zodPassword,
  firstName: z
    .string()
    .min(1, { message: 'First name is required' })
    .max(100, { message: 'First name too long' })
    .transform((s) => s.trim()),
  lastName: z
    .string()
    .min(1, { message: 'Last name is required' })
    .max(100, { message: 'Last name too long' })
    .transform((s) => s.trim()),
  role: UserRole.optional().default('ANALYST'),
});

/**
 * User login schema
 */
export const UserLoginSchema = z.object({
  email: zodEmail,
  password: z.string().min(1, { message: 'Password is required' }),
  rememberMe: z.boolean().optional().default(false),
  mfaCode: z.string().length(6).optional(),
});

/**
 * Entity creation schema
 */
export const EntityCreateSchema = z.object({
  type: EntityType,
  label: z
    .string()
    .min(1, { message: 'Entity label is required' })
    .max(500, { message: 'Entity label too long' })
    .transform((s) => s.trim()),
  description: z
    .string()
    .max(5000, { message: 'Description too long' })
    .optional()
    .transform((s) => s?.trim()),
  properties: z.record(z.unknown()).optional().default({}),
  investigationId: zodUUID.optional(),
  tags: z.array(z.string().max(50)).max(20).optional().default([]),
  confidence: z.number().min(0).max(1).optional().default(0.5),
  source: z.string().max(200).optional(),
});

/**
 * Entity update schema
 */
export const EntityUpdateSchema = EntityCreateSchema.partial().extend({
  id: zodUUID,
});

/**
 * Relationship creation schema
 */
export const RelationshipCreateSchema = z.object({
  type: RelationshipType,
  sourceId: zodUUID,
  targetId: zodUUID,
  properties: z.record(z.unknown()).optional().default({}),
  confidence: z.number().min(0).max(1).optional().default(0.5),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  bidirectional: z.boolean().optional().default(false),
});

/**
 * Investigation creation schema
 */
export const InvestigationCreateSchema = z.object({
  title: z
    .string()
    .min(1, { message: 'Investigation title is required' })
    .max(200, { message: 'Title too long' })
    .transform((s) => s.trim()),
  description: z
    .string()
    .max(10000, { message: 'Description too long' })
    .optional()
    .transform((s) => s?.trim()),
  status: InvestigationStatus.optional().default('DRAFT'),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional().default('MEDIUM'),
  assignees: z.array(zodUUID).optional().default([]),
  tags: z.array(z.string().max(50)).max(50).optional().default([]),
  dueDate: z.coerce.date().optional(),
  classification: z.string().max(100).optional(),
});

/**
 * GraphQL query input schema
 */
export const GraphQLQuerySchema = z.object({
  query: z
    .string()
    .min(1, { message: 'Query is required' })
    .max(50000, { message: 'Query too large' }),
  variables: z.record(z.unknown()).optional(),
  operationName: z.string().max(200).optional(),
});

/**
 * Search input schema
 */
export const SearchInputSchema = z.object({
  query: zodSearchQuery,
  entityTypes: z.array(EntityType).optional(),
  investigationIds: z.array(zodUUID).optional(),
  dateRange: zodDateRange.optional(),
  tags: z.array(z.string()).optional(),
  confidence: z.object({
    min: z.number().min(0).max(1).optional(),
    max: z.number().min(0).max(1).optional(),
  }).optional(),
  pagination: zodPagination.optional(),
});

/**
 * AI analysis request schema
 */
export const AIAnalysisSchema = z.object({
  entityIds: z.array(zodUUID).min(1).max(100),
  analysisType: z.enum([
    'ENTITY_RESOLUTION',
    'RELATIONSHIP_INFERENCE',
    'ANOMALY_DETECTION',
    'CLUSTERING',
    'SUMMARIZATION',
    'SENTIMENT_ANALYSIS',
  ]),
  parameters: z.record(z.unknown()).optional(),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH']).optional().default('NORMAL'),
});

// ============================================================================
// Sanitization Utilities
// ============================================================================

/**
 * HTML escape function
 */
function escapeHtml(str: string): string {
  const htmlEscapes: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
  };
  return str.replace(/[&<>"'/]/g, (char) => htmlEscapes[char]);
}

/**
 * Sanitize string input
 */
export function sanitizeString(input: string): string {
  return escapeHtml(input.trim());
}

/**
 * Sanitize object recursively
 */
export function sanitizeObject<T extends Record<string, unknown>>(obj: T): T {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      result[key] = sanitizeString(value);
    } else if (Array.isArray(value)) {
      result[key] = value.map((item) =>
        typeof item === 'string'
          ? sanitizeString(item)
          : typeof item === 'object' && item !== null
            ? sanitizeObject(item as Record<string, unknown>)
            : item
      );
    } else if (typeof value === 'object' && value !== null) {
      result[key] = sanitizeObject(value as Record<string, unknown>);
    } else {
      result[key] = value;
    }
  }

  return result as T;
}

// ============================================================================
// Validation Middleware Factory
// ============================================================================

/**
 * Format Zod errors into standardized format
 */
function formatZodErrors(error: ZodError): Array<{
  field: string;
  message: string;
  code: string;
  value?: unknown;
}> {
  return error.errors.map((err) => ({
    field: err.path.join('.') || 'root',
    message: err.message,
    code: err.code,
    value: undefined, // Don't include potentially sensitive values
  }));
}

/**
 * Validate data against schema
 */
export function validate<T>(
  schema: ZodSchema<T>,
  data: unknown,
  options: ValidationOptions = {}
): ValidationResult<T> {
  try {
    const sanitizedData = options.sanitize && typeof data === 'object' && data !== null
      ? sanitizeObject(data as Record<string, unknown>)
      : data;

    const result = schema.parse(sanitizedData);
    return { success: true, data: result };
  } catch (error) {
    if (error instanceof ZodError) {
      return {
        success: false,
        errors: formatZodErrors(error),
      };
    }
    throw error;
  }
}

/**
 * Create validation middleware for Express routes
 */
export function validateBody<T>(
  schema: ZodSchema<T>,
  options: ValidationOptions = {}
): (req: Request, res: Response, next: NextFunction) => void {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = validate(schema, req.body, { sanitize: true, ...options });

    if (!result.success) {
      next(new ValidationError('Request validation failed', result.errors));
      return;
    }

    req.body = result.data;
    next();
  };
}

/**
 * Create validation middleware for query parameters
 */
export function validateQuery<T>(
  schema: ZodSchema<T>,
  options: ValidationOptions = {}
): (req: Request, res: Response, next: NextFunction) => void {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = validate(schema, req.query, { sanitize: true, ...options });

    if (!result.success) {
      next(new ValidationError('Query parameter validation failed', result.errors));
      return;
    }

    (req as any).validatedQuery = result.data;
    next();
  };
}

/**
 * Create validation middleware for URL parameters
 */
export function validateParams<T>(
  schema: ZodSchema<T>,
  options: ValidationOptions = {}
): (req: Request, res: Response, next: NextFunction) => void {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = validate(schema, req.params, options);

    if (!result.success) {
      next(new ValidationError('URL parameter validation failed', result.errors));
      return;
    }

    (req as any).validatedParams = result.data;
    next();
  };
}

// ============================================================================
// GraphQL Validation
// ============================================================================

/**
 * GraphQL input validator
 */
export class GraphQLInputValidator {
  private schemas: Map<string, ZodSchema> = new Map();

  constructor() {
    // Register default schemas
    this.register('CreateEntity', EntityCreateSchema);
    this.register('UpdateEntity', EntityUpdateSchema);
    this.register('CreateRelationship', RelationshipCreateSchema);
    this.register('CreateInvestigation', InvestigationCreateSchema);
    this.register('SearchInput', SearchInputSchema);
    this.register('AIAnalysis', AIAnalysisSchema);
  }

  /**
   * Register a schema for a GraphQL input type
   */
  register(typeName: string, schema: ZodSchema): void {
    this.schemas.set(typeName, schema);
  }

  /**
   * Validate GraphQL input
   */
  validate<T>(typeName: string, input: unknown): ValidationResult<T> {
    const schema = this.schemas.get(typeName);

    if (!schema) {
      return {
        success: false,
        errors: [{ field: 'type', message: `Unknown input type: ${typeName}`, code: 'unknown_type' }],
      };
    }

    return validate(schema, input, { sanitize: true });
  }

  /**
   * Create a GraphQL resolver wrapper with validation
   */
  withValidation<TArgs, TResult>(
    typeName: string,
    resolver: (parent: unknown, args: TArgs, context: unknown, info: unknown) => Promise<TResult>
  ): (parent: unknown, args: { input: unknown }, context: unknown, info: unknown) => Promise<TResult> {
    return async (parent, args, context, info) => {
      const result = this.validate<TArgs>(typeName, args.input);

      if (!result.success) {
        throw new ValidationError(
          `Validation failed for ${typeName}`,
          result.errors
        );
      }

      return resolver(parent, result.data as TArgs, context, info);
    };
  }
}

// ============================================================================
// Custom Validators
// ============================================================================

/**
 * Validate Neo4j Cypher query for safety
 */
export function validateCypherQuery(query: string): ValidationResult<string> {
  const dangerousPatterns = [
    /\bCALL\s+\{/i, // Subqueries that could be harmful
    /\bAPOC\./i, // APOC procedures (unless whitelisted)
    /\bdbms\./i, // Database management procedures
    /\bdb\.index/i, // Index management
    /\bCREATE\s+INDEX/i,
    /\bDROP\s+INDEX/i,
    /\bCREATE\s+CONSTRAINT/i,
    /\bDROP\s+CONSTRAINT/i,
    /\bLOAD\s+CSV/i, // File access
    /\/\//i, // Comments that could hide malicious code
  ];

  for (const pattern of dangerousPatterns) {
    if (pattern.test(query)) {
      return {
        success: false,
        errors: [{
          field: 'query',
          message: 'Query contains potentially dangerous operations',
          code: 'dangerous_query',
        }],
      };
    }
  }

  return { success: true, data: query };
}

/**
 * Validate file upload
 */
export const FileUploadSchema = z.object({
  filename: z
    .string()
    .max(255)
    .regex(/^[a-zA-Z0-9_.-]+$/, { message: 'Invalid filename characters' }),
  mimetype: z.enum([
    'application/pdf',
    'application/json',
    'text/plain',
    'text/csv',
    'image/png',
    'image/jpeg',
    'image/gif',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ]),
  size: z.number().max(50 * 1024 * 1024, { message: 'File size exceeds 50MB limit' }),
});

/**
 * Validate IP address
 */
export const zodIPAddress = z.string().refine(
  (ip) => {
    // IPv4
    const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (ipv4Regex.test(ip)) {
      return ip.split('.').every((octet) => {
        const num = parseInt(octet, 10);
        return num >= 0 && num <= 255;
      });
    }
    // IPv6 (simplified)
    const ipv6Regex = /^([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}$/;
    return ipv6Regex.test(ip);
  },
  { message: 'Invalid IP address format' }
);

/**
 * Validate URL
 */
export const zodURL = z.string().url().refine(
  (url) => {
    try {
      const parsed = new URL(url);
      return ['http:', 'https:'].includes(parsed.protocol);
    } catch {
      return false;
    }
  },
  { message: 'URL must use HTTP or HTTPS protocol' }
);

// ============================================================================
// Rate Limit Validation
// ============================================================================

/**
 * API Key validation schema
 */
export const APIKeySchema = z
  .string()
  .min(32, { message: 'API key too short' })
  .max(128, { message: 'API key too long' })
  .regex(/^[a-zA-Z0-9_-]+$/, { message: 'Invalid API key format' });

/**
 * JWT validation schema (structure only, not signature)
 */
export const JWTSchema = z
  .string()
  .regex(/^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$/, {
    message: 'Invalid JWT format',
  });

// ============================================================================
// Export Singleton Instance
// ============================================================================

export const graphqlValidator = new GraphQLInputValidator();

export default {
  validate,
  validateBody,
  validateQuery,
  validateParams,
  sanitizeString,
  sanitizeObject,
  graphqlValidator,
  schemas: {
    UserRegistration: UserRegistrationSchema,
    UserLogin: UserLoginSchema,
    EntityCreate: EntityCreateSchema,
    EntityUpdate: EntityUpdateSchema,
    RelationshipCreate: RelationshipCreateSchema,
    InvestigationCreate: InvestigationCreateSchema,
    GraphQLQuery: GraphQLQuerySchema,
    Search: SearchInputSchema,
    AIAnalysis: AIAnalysisSchema,
    FileUpload: FileUploadSchema,
    Pagination: zodPagination,
    DateRange: zodDateRange,
  },
  types: {
    UUID: zodUUID,
    Email: zodEmail,
    Password: zodPassword,
    Username: zodUsername,
    SearchQuery: zodSearchQuery,
    EntityType,
    RelationshipType,
    UserRole,
    InvestigationStatus,
    IPAddress: zodIPAddress,
    URL: zodURL,
    APIKey: APIKeySchema,
    JWT: JWTSchema,
  },
};
