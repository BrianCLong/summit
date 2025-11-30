/**
 * OpenAPI Specification Generator
 *
 * Generates OpenAPI 3.0 specification from route definitions
 */

import type { OpenAPIObject, PathItemObject, OperationObject } from 'openapi3-ts/oas31';
import type { APIConfig, RouteDefinition, HTTPMethod } from '../types';

export class OpenAPIGenerator {
  private config: APIConfig;
  private spec: OpenAPIObject;

  constructor(config: APIConfig) {
    this.config = config;

    this.spec = {
      openapi: '3.0.3',
      info: {
        title: config.title,
        version: config.version,
        description: config.description,
      },
      servers: config.openapi?.servers || [
        {
          url: `${config.basePath || ''}`,
          description: 'API Server',
        },
      ],
      paths: {},
      components: {
        schemas: {},
        securitySchemes: config.openapi?.securitySchemes || {},
      },
    };
  }

  /**
   * Add routes to the specification
   */
  addRoutes(routes: RouteDefinition[]): this {
    routes.forEach((route) => {
      this.addRoute(route);
    });

    return this;
  }

  /**
   * Add a single route to the specification
   */
  addRoute(route: RouteDefinition): this {
    const { method, path, openapi } = route;

    if (!openapi) {
      return this;
    }

    // Ensure path exists
    if (!this.spec.paths![path]) {
      this.spec.paths![path] = {};
    }

    // Convert method to lowercase for OpenAPI
    const openapiMethod = method.toLowerCase() as Lowercase<HTTPMethod>;

    // Create operation object
    const operation: OperationObject = {
      summary: openapi.summary,
      description: openapi.description,
      operationId: openapi.operationId || `${method.toLowerCase()}_${path.replace(/[^a-zA-Z0-9]/g, '_')}`,
      tags: openapi.tags,
      parameters: openapi.parameters?.map((param) => ({
        name: param.name,
        in: param.in,
        description: param.description,
        required: param.required,
        schema: param.schema,
        example: param.example,
      })),
      requestBody: openapi.requestBody
        ? {
            description: openapi.requestBody.description,
            required: openapi.requestBody.required,
            content: openapi.requestBody.content,
          }
        : undefined,
      responses: openapi.responses,
      security: openapi.security,
      deprecated: openapi.deprecated,
    };

    // Add operation to path
    (this.spec.paths![path] as any)[openapiMethod] = operation;

    return this;
  }

  /**
   * Add a schema definition
   */
  addSchema(name: string, schema: any): this {
    if (!this.spec.components!.schemas) {
      this.spec.components!.schemas = {};
    }

    this.spec.components!.schemas[name] = schema;

    return this;
  }

  /**
   * Add multiple schema definitions
   */
  addSchemas(schemas: Record<string, any>): this {
    Object.entries(schemas).forEach(([name, schema]) => {
      this.addSchema(name, schema);
    });

    return this;
  }

  /**
   * Add a security scheme
   */
  addSecurityScheme(name: string, scheme: any): this {
    if (!this.spec.components!.securitySchemes) {
      this.spec.components!.securitySchemes = {};
    }

    this.spec.components!.securitySchemes[name] = scheme;

    return this;
  }

  /**
   * Get the generated specification
   */
  getSpec(): OpenAPIObject {
    return this.spec;
  }

  /**
   * Get the specification as JSON
   */
  toJSON(): string {
    return JSON.stringify(this.spec, null, 2);
  }

  /**
   * Generate common security schemes
   */
  static generateSecuritySchemes(config: APIConfig) {
    const schemes: Record<string, any> = {};

    if (config.security?.apiKeys?.enabled) {
      schemes.apiKey = {
        type: 'apiKey',
        in: config.security.apiKeys.header ? 'header' : 'query',
        name: config.security.apiKeys.header || config.security.apiKeys.query || 'api-key',
      };
    }

    if (config.security?.jwt?.enabled) {
      schemes.bearerAuth = {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      };
    }

    if (config.security?.oauth?.enabled) {
      schemes.oauth2 = {
        type: 'oauth2',
        flows: {
          authorizationCode: {
            authorizationUrl: config.security.oauth.authorizationURL,
            tokenUrl: config.security.oauth.tokenURL,
            scopes: config.security.oauth.scopes || {},
          },
        },
      };
    }

    return schemes;
  }

  /**
   * Generate common response schemas
   */
  static generateCommonSchemas() {
    return {
      APIResponse: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            description: 'Indicates if the request was successful',
          },
          data: {
            description: 'Response data',
          },
          error: {
            $ref: '#/components/schemas/APIError',
          },
          metadata: {
            $ref: '#/components/schemas/ResponseMetadata',
          },
          links: {
            $ref: '#/components/schemas/HATEOASLinks',
          },
        },
        required: ['success'],
      },
      APIError: {
        type: 'object',
        properties: {
          code: {
            type: 'string',
            description: 'Error code',
          },
          message: {
            type: 'string',
            description: 'Error message',
          },
          details: {
            description: 'Additional error details',
          },
          timestamp: {
            type: 'string',
            format: 'date-time',
            description: 'Error timestamp',
          },
          path: {
            type: 'string',
            description: 'Request path',
          },
          traceId: {
            type: 'string',
            description: 'Trace ID for debugging',
          },
        },
        required: ['code', 'message', 'timestamp', 'path'],
      },
      ResponseMetadata: {
        type: 'object',
        properties: {
          timestamp: {
            type: 'string',
            format: 'date-time',
          },
          version: {
            type: 'string',
          },
          requestId: {
            type: 'string',
          },
          duration: {
            type: 'number',
            description: 'Request duration in milliseconds',
          },
          pagination: {
            $ref: '#/components/schemas/PaginationMetadata',
          },
        },
        required: ['timestamp', 'version', 'requestId'],
      },
      PaginationMetadata: {
        type: 'object',
        properties: {
          total: {
            type: 'integer',
            description: 'Total number of items',
          },
          count: {
            type: 'integer',
            description: 'Number of items in this response',
          },
          limit: {
            type: 'integer',
            description: 'Maximum number of items per page',
          },
          offset: {
            type: 'integer',
            description: 'Offset for pagination',
          },
          cursor: {
            type: 'string',
            description: 'Cursor for cursor-based pagination',
          },
          hasMore: {
            type: 'boolean',
            description: 'Indicates if more items are available',
          },
        },
        required: ['count', 'limit', 'hasMore'],
      },
      HATEOASLinks: {
        type: 'object',
        properties: {
          self: {
            $ref: '#/components/schemas/Link',
          },
          next: {
            $ref: '#/components/schemas/Link',
          },
          prev: {
            $ref: '#/components/schemas/Link',
          },
          first: {
            $ref: '#/components/schemas/Link',
          },
          last: {
            $ref: '#/components/schemas/Link',
          },
        },
        required: ['self'],
      },
      Link: {
        type: 'object',
        properties: {
          href: {
            type: 'string',
            format: 'uri',
          },
          method: {
            type: 'string',
            enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
          },
          type: {
            type: 'string',
          },
        },
        required: ['href'],
      },
    };
  }
}
