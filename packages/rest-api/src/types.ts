/**
 * REST API Framework Type Definitions
 */

import type { Request, Response, NextFunction, RequestHandler } from 'express';
import type { OpenAPIObject, PathItemObject, OperationObject } from 'openapi3-ts/oas31';

// ===== API Configuration =====

export interface APIConfig {
  version: string;
  basePath?: string;
  title: string;
  description?: string;
  cors?: CORSOptions;
  rateLimit?: RateLimitOptions;
  security?: SecurityOptions;
  pagination?: PaginationOptions;
  validation?: ValidationOptions;
  openapi?: OpenAPIOptions;
}

export interface CORSOptions {
  enabled: boolean;
  origin?: string | string[] | ((origin: string) => boolean);
  credentials?: boolean;
  methods?: string[];
  allowedHeaders?: string[];
  exposedHeaders?: string[];
  maxAge?: number;
}

export interface RateLimitOptions {
  enabled: boolean;
  windowMs?: number;
  max?: number;
  message?: string;
  standardHeaders?: boolean;
  legacyHeaders?: boolean;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  keyGenerator?: (req: Request) => string;
}

export interface SecurityOptions {
  apiKeys?: {
    enabled: boolean;
    header?: string;
    query?: string;
  };
  jwt?: {
    enabled: boolean;
    secret: string;
    algorithms?: string[];
    issuer?: string;
    audience?: string;
  };
  oauth?: {
    enabled: boolean;
    authorizationURL: string;
    tokenURL: string;
    scopes?: Record<string, string>;
  };
}

export interface PaginationOptions {
  defaultLimit: number;
  maxLimit: number;
  strategy: 'offset' | 'cursor';
}

export interface ValidationOptions {
  enabled: boolean;
  removeAdditional?: boolean | 'all' | 'failing';
  coerceTypes?: boolean | 'array';
  useDefaults?: boolean | 'empty';
}

export interface OpenAPIOptions {
  enabled: boolean;
  path?: string;
  uiPath?: string;
  securitySchemes?: Record<string, any>;
  servers?: Array<{ url: string; description?: string }>;
}

// ===== Route Definition =====

export interface RouteDefinition {
  method: HTTPMethod;
  path: string;
  handler: RequestHandler | RequestHandler[];
  middleware?: RequestHandler[];
  openapi?: RouteOpenAPISpec;
  rateLimit?: RateLimitOptions;
  cache?: CacheOptions;
}

export type HTTPMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';

export interface RouteOpenAPISpec {
  summary?: string;
  description?: string;
  operationId?: string;
  tags?: string[];
  parameters?: ParameterSpec[];
  requestBody?: RequestBodySpec;
  responses: ResponsesSpec;
  security?: SecurityRequirement[];
  deprecated?: boolean;
}

export interface ParameterSpec {
  name: string;
  in: 'query' | 'path' | 'header' | 'cookie';
  description?: string;
  required?: boolean;
  schema: JSONSchema;
  example?: any;
}

export interface RequestBodySpec {
  description?: string;
  required?: boolean;
  content: Record<string, { schema: JSONSchema; example?: any }>;
}

export interface ResponsesSpec {
  [statusCode: string]: ResponseSpec;
}

export interface ResponseSpec {
  description: string;
  content?: Record<string, { schema: JSONSchema; example?: any }>;
  headers?: Record<string, HeaderSpec>;
}

export interface HeaderSpec {
  description?: string;
  schema: JSONSchema;
}

export interface SecurityRequirement {
  [name: string]: string[];
}

export interface JSONSchema {
  type?: string;
  properties?: Record<string, JSONSchema>;
  items?: JSONSchema;
  required?: string[];
  enum?: any[];
  format?: string;
  pattern?: string;
  minLength?: number;
  maxLength?: number;
  minimum?: number;
  maximum?: number;
  description?: string;
  example?: any;
  default?: any;
  nullable?: boolean;
  $ref?: string;
}

// ===== Cache Options =====

export interface CacheOptions {
  enabled: boolean;
  ttl: number;
  key?: (req: Request) => string;
  invalidateOn?: string[];
}

// ===== API Response =====

export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: APIError;
  metadata?: ResponseMetadata;
  links?: HATEOASLinks;
}

export interface APIError {
  code: string;
  message: string;
  details?: any;
  timestamp: string;
  path: string;
  traceId?: string;
}

export interface ResponseMetadata {
  timestamp: string;
  version: string;
  requestId: string;
  duration?: number;
  pagination?: PaginationMetadata;
}

export interface PaginationMetadata {
  total?: number;
  count: number;
  limit: number;
  offset?: number;
  cursor?: string;
  hasMore: boolean;
}

export interface HATEOASLinks {
  self: Link;
  next?: Link;
  prev?: Link;
  first?: Link;
  last?: Link;
  [rel: string]: Link | undefined;
}

export interface Link {
  href: string;
  method?: string;
  type?: string;
}

// ===== Batch Operations =====

export interface BatchRequest {
  operations: BatchOperation[];
  sequential?: boolean;
  stopOnError?: boolean;
}

export interface BatchOperation {
  id: string;
  method: HTTPMethod;
  path: string;
  headers?: Record<string, string>;
  body?: any;
}

export interface BatchResponse {
  results: BatchOperationResult[];
  errors?: BatchError[];
}

export interface BatchOperationResult {
  id: string;
  status: number;
  headers?: Record<string, string>;
  body?: any;
  error?: APIError;
}

export interface BatchError {
  id: string;
  error: APIError;
}

// ===== Idempotency =====

export interface IdempotencyOptions {
  enabled: boolean;
  header?: string;
  ttl?: number;
  storage?: IdempotencyStorage;
}

export interface IdempotencyStorage {
  get(key: string): Promise<IdempotencyRecord | null>;
  set(key: string, record: IdempotencyRecord, ttl: number): Promise<void>;
  delete(key: string): Promise<void>;
}

export interface IdempotencyRecord {
  key: string;
  status: number;
  headers: Record<string, string>;
  body: any;
  createdAt: Date;
}

// ===== Versioning =====

export interface VersioningOptions {
  strategy: 'url' | 'header' | 'query' | 'accept';
  headerName?: string;
  queryName?: string;
  acceptPrefix?: string;
  defaultVersion?: string;
  deprecationWarnings?: boolean;
}

export interface VersionInfo {
  version: string;
  deprecated?: boolean;
  sunset?: Date;
  alternativeVersion?: string;
}

// ===== Middleware Context =====

export interface RequestContext {
  requestId: string;
  startTime: number;
  user?: any;
  scope?: string[];
  traceId?: string;
  spanId?: string;
  idempotencyKey?: string;
  apiVersion?: string;
}

// ===== API Analytics =====

export interface RequestMetrics {
  requestId: string;
  method: string;
  path: string;
  statusCode: number;
  duration: number;
  timestamp: Date;
  userId?: string;
  apiVersion?: string;
  userAgent?: string;
  ip?: string;
  error?: APIError;
}

// ===== Extended Express Types =====

declare global {
  namespace Express {
    interface Request {
      context?: RequestContext;
      pagination?: PaginationMetadata;
      validated?: {
        query?: any;
        body?: any;
        params?: any;
      };
    }
  }
}

export type { Request, Response, NextFunction, RequestHandler };
