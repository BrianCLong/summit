/**
 * OpenAPI Request/Response Validation Middleware
 *
 * Validates incoming requests and outgoing responses against OpenAPI specification
 * MIT License - Copyright (c) 2025 IntelGraph
 */

import type { Request, Response, NextFunction, RequestHandler } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';
import Ajv, { type ValidateFunction } from 'ajv';
import addFormats from 'ajv-formats';

interface OpenAPISpec {
  paths?: Record<string, any>;
  components?: {
    schemas?: Record<string, any>;
  };
}

interface ValidationError {
  path: string;
  message: string;
  value?: any;
}

class OpenAPIValidator {
  private spec: OpenAPISpec | null = null;
  private ajv: Ajv;
  private validators: Map<string, ValidateFunction> = new Map();

  constructor() {
    this.ajv = new Ajv({
      allErrors: true,
      strict: false,
      coerceTypes: true,
    });
    addFormats(this.ajv);
    this.loadSpec();
  }

  /**
   * Load OpenAPI specification from file
   */
  private loadSpec(): void {
    try {
      const specPath = path.resolve(process.cwd(), 'openapi', 'spec.yaml');
      if (!fs.existsSync(specPath)) {
        console.warn('OpenAPI spec not found at', specPath);
        return;
      }

      const yamlContent = fs.readFileSync(specPath, 'utf8');
      this.spec = yaml.load(yamlContent) as OpenAPISpec;

      // Compile schemas for all request/response bodies
      this.compileSchemas();

      console.log('✓ OpenAPI specification loaded and schemas compiled');
    } catch (error) {
      console.error('Failed to load OpenAPI spec:', error);
    }
  }

  /**
   * Compile JSON schemas for validation
   */
  private compileSchemas(): void {
    if (!this.spec?.components?.schemas) return;

    // Add all component schemas to AJV
    for (const [name, schema] of Object.entries(this.spec.components.schemas)) {
      try {
        this.ajv.addSchema(schema, `#/components/schemas/${name}`);
      } catch (error) {
        console.warn(`Failed to compile schema ${name}:`, error);
      }
    }
  }

  /**
   * Find operation spec for a given request
   */
  private findOperationSpec(method: string, path: string): any | null {
    if (!this.spec?.paths) return null;

    // Normalize path - remove /api prefix if present
    const normalizedPath = path.replace(/^\/api/, '/api');

    // Try exact match first
    const pathItem = this.spec.paths[normalizedPath];
    if (pathItem) {
      return pathItem[method.toLowerCase()];
    }

    // Try pattern matching for path parameters
    for (const [specPath, pathItem] of Object.entries(this.spec.paths)) {
      const pattern = specPath.replace(/\{[^}]+\}/g, '[^/]+');
      const regex = new RegExp(`^${pattern}$`);
      if (regex.test(normalizedPath)) {
        return pathItem[method.toLowerCase()];
      }
    }

    return null;
  }

  /**
   * Validate request body against schema
   */
  validateRequestBody(
    req: Request,
    operationSpec: any,
  ): ValidationError[] | null {
    if (!operationSpec?.requestBody?.content?.['application/json']?.schema) {
      return null;
    }

    const schema =
      operationSpec.requestBody.content['application/json'].schema;

    // Resolve schema reference if needed
    let schemaToValidate = schema;
    if (schema.$ref) {
      const schemaName = schema.$ref.split('/').pop();
      schemaToValidate = this.spec?.components?.schemas?.[schemaName];
    }

    if (!schemaToValidate) return null;

    const validate = this.ajv.compile(schemaToValidate);
    const valid = validate(req.body);

    if (!valid && validate.errors) {
      return validate.errors.map((err) => ({
        path: err.instancePath || '/',
        message: err.message || 'Validation error',
        value: err.data,
      }));
    }

    return null;
  }

  /**
   * Validate response body against schema
   */
  validateResponseBody(
    statusCode: number,
    body: any,
    operationSpec: any,
  ): ValidationError[] | null {
    const responseSpec = operationSpec?.responses?.[String(statusCode)];
    if (!responseSpec?.content?.['application/json']?.schema) {
      return null;
    }

    const schema = responseSpec.content['application/json'].schema;

    // Resolve schema reference if needed
    let schemaToValidate = schema;
    if (schema.$ref) {
      const schemaName = schema.$ref.split('/').pop();
      schemaToValidate = this.spec?.components?.schemas?.[schemaName];
    }

    if (!schemaToValidate) return null;

    const validate = this.ajv.compile(schemaToValidate);
    const valid = validate(body);

    if (!valid && validate.errors) {
      return validate.errors.map((err) => ({
        path: err.instancePath || '/',
        message: err.message || 'Validation error',
        value: err.data,
      }));
    }

    return null;
  }

  /**
   * Express middleware for request validation
   */
  validateRequest(): RequestHandler {
    return (req: Request, res: Response, next: NextFunction) => {
      // Skip validation if spec not loaded
      if (!this.spec) {
        return next();
      }

      // Skip validation for non-API routes
      if (!req.path.startsWith('/api/')) {
        return next();
      }

      const operationSpec = this.findOperationSpec(req.method, req.path);

      // If no spec found, allow request (graceful degradation)
      if (!operationSpec) {
        return next();
      }

      // Validate request body for POST/PUT/PATCH
      if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
        const errors = this.validateRequestBody(req, operationSpec);

        if (errors && errors.length > 0) {
          return res.status(400).json({
            ok: false,
            error: 'Request validation failed',
            validationErrors: errors,
          });
        }
      }

      next();
    };
  }

  /**
   * Response validation wrapper
   */
  validateResponse(): RequestHandler {
    return (req: Request, res: Response, next: NextFunction) => {
      // Skip validation if spec not loaded or not in development
      if (!this.spec || process.env.NODE_ENV === 'production') {
        return next();
      }

      const originalJson = res.json.bind(res);

      res.json = function (body: any) {
        const operationSpec = this.findOperationSpec(req.method, req.path);

        if (operationSpec) {
          const errors = this.validateResponseBody(
            res.statusCode,
            body,
            operationSpec,
          );

          if (errors && errors.length > 0) {
            console.warn('Response validation failed:', {
              method: req.method,
              path: req.path,
              statusCode: res.statusCode,
              errors,
            });
          }
        }

        return originalJson(body);
      }.bind(this);

      next();
    };
  }
}

// Singleton instance
const validatorInstance = new OpenAPIValidator();

/**
 * Middleware to validate requests against OpenAPI spec
 */
export const validateRequest = validatorInstance.validateRequest();

/**
 * Middleware to validate responses against OpenAPI spec (dev only)
 */
export const validateResponse = validatorInstance.validateResponse();

/**
 * Manual validation function for testing
 */
export function validateData(schema: any, data: any): ValidationError[] | null {
  const ajv = new Ajv({ allErrors: true });
  addFormats(ajv);

  const validate = ajv.compile(schema);
  const valid = validate(data);

  if (!valid && validate.errors) {
    return validate.errors.map((err) => ({
      path: err.instancePath || '/',
      message: err.message || 'Validation error',
      value: err.data,
    }));
  }

  return null;
}

export default validatorInstance;
