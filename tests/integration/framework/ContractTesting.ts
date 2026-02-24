/**
 * Contract Testing Utilities
 *
 * Provides tools for verifying API contracts between services.
 * Supports schema validation, response matching, and contract evolution.
 *
 * @module tests/integration/framework
 */

import Ajv, { ValidateFunction, ErrorObject } from 'ajv';
import addFormats from 'ajv-formats';

/**
 * Contract definition
 */
export interface Contract {
  name: string;
  version: string;
  provider: string;
  consumer: string;
  interactions: ContractInteraction[];
}

/**
 * Contract interaction (request/response pair)
 */
export interface ContractInteraction {
  description: string;
  request: ContractRequest;
  response: ContractResponse;
}

/**
 * Contract request definition
 */
export interface ContractRequest {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  headers?: Record<string, string>;
  query?: Record<string, string>;
  body?: any;
  bodySchema?: object;
}

/**
 * Contract response definition
 */
export interface ContractResponse {
  status: number;
  headers?: Record<string, string>;
  body?: any;
  bodySchema?: object;
}

/**
 * Contract verification result
 */
export interface ContractVerificationResult {
  contract: string;
  version: string;
  success: boolean;
  interactions: InteractionResult[];
  timestamp: Date;
  duration: number;
}

/**
 * Interaction verification result
 */
export interface InteractionResult {
  description: string;
  success: boolean;
  request: {
    sent: any;
    valid: boolean;
    errors?: string[];
  };
  response: {
    received: any;
    expected: any;
    valid: boolean;
    errors?: string[];
  };
  latency: number;
}

/**
 * Schema validation result
 */
export interface SchemaValidationResult {
  valid: boolean;
  errors: string[];
  data: any;
}

/**
 * Contract Verifier
 *
 * Verifies that service responses match defined contracts.
 *
 * @example
 * ```typescript
 * const verifier = new ContractVerifier();
 *
 * const contract: Contract = {
 *   name: 'API-GraphAPI-Contract',
 *   version: '1.0.0',
 *   provider: 'api',
 *   consumer: 'graph-api',
 *   interactions: [
 *     {
 *       description: 'Get entity by ID',
 *       request: {
 *         method: 'GET',
 *         path: '/api/entities/:id',
 *       },
 *       response: {
 *         status: 200,
 *         bodySchema: entitySchema,
 *       },
 *     },
 *   ],
 * };
 *
 * const result = await verifier.verify(contract, 'http://localhost:4000');
 * ```
 */
export class ContractVerifier {
  private ajv: Ajv;
  private schemaCache: Map<string, ValidateFunction> = new Map();

  constructor() {
    this.ajv = new Ajv({
      allErrors: true,
      strict: false,
      validateFormats: true,
    });
    addFormats(this.ajv);
  }

  /**
   * Verify a contract against a service
   */
  async verify(contract: Contract, baseUrl: string): Promise<ContractVerificationResult> {
    const startTime = Date.now();
    const interactionResults: InteractionResult[] = [];

    for (const interaction of contract.interactions) {
      const result = await this.verifyInteraction(interaction, baseUrl);
      interactionResults.push(result);
    }

    const success = interactionResults.every((r) => r.success);

    return {
      contract: contract.name,
      version: contract.version,
      success,
      interactions: interactionResults,
      timestamp: new Date(),
      duration: Date.now() - startTime,
    };
  }

  /**
   * Verify a single interaction
   */
  private async verifyInteraction(
    interaction: ContractInteraction,
    baseUrl: string
  ): Promise<InteractionResult> {
    const startTime = Date.now();
    const requestErrors: string[] = [];
    let responseErrors: string[] = [];
    let receivedResponse: any = null;

    try {
      // Validate request if schema provided
      if (interaction.request.bodySchema && interaction.request.body) {
        const requestValidation = this.validateSchema(
          interaction.request.body,
          interaction.request.bodySchema
        );
        if (!requestValidation.valid) {
          requestErrors.push(...requestValidation.errors);
        }
      }

      // Make the request
      const url = `${baseUrl}${interaction.request.path}`;
      const response = await fetch(url, {
        method: interaction.request.method,
        headers: {
          'Content-Type': 'application/json',
          ...interaction.request.headers,
        },
        body: interaction.request.body ? JSON.stringify(interaction.request.body) : undefined,
      });

      receivedResponse = {
        status: response.status,
        headers: Object.fromEntries(response.headers.entries()),
        body: await response.json().catch(() => null),
      };

      // Verify response status
      if (response.status !== interaction.response.status) {
        responseErrors.push(
          `Expected status ${interaction.response.status}, got ${response.status}`
        );
      }

      // Verify response body schema
      if (interaction.response.bodySchema && receivedResponse.body) {
        const bodyValidation = this.validateSchema(
          receivedResponse.body,
          interaction.response.bodySchema
        );
        if (!bodyValidation.valid) {
          responseErrors.push(...bodyValidation.errors);
        }
      }

      // Verify response headers
      if (interaction.response.headers) {
        for (const [key, value] of Object.entries(interaction.response.headers)) {
          const receivedHeader = receivedResponse.headers[key.toLowerCase()];
          if (receivedHeader !== value) {
            responseErrors.push(
              `Expected header ${key}="${value}", got "${receivedHeader}"`
            );
          }
        }
      }
    } catch (error: any) {
      responseErrors.push(`Request failed: ${error.message}`);
    }

    const success = requestErrors.length === 0 && responseErrors.length === 0;

    return {
      description: interaction.description,
      success,
      request: {
        sent: interaction.request,
        valid: requestErrors.length === 0,
        errors: requestErrors.length > 0 ? requestErrors : undefined,
      },
      response: {
        received: receivedResponse,
        expected: interaction.response,
        valid: responseErrors.length === 0,
        errors: responseErrors.length > 0 ? responseErrors : undefined,
      },
      latency: Date.now() - startTime,
    };
  }

  /**
   * Validate data against a JSON schema
   */
  validateSchema(data: any, schema: object): SchemaValidationResult {
    const schemaKey = JSON.stringify(schema);
    let validate = this.schemaCache.get(schemaKey);

    if (!validate) {
      validate = this.ajv.compile(schema);
      this.schemaCache.set(schemaKey, validate);
    }

    const valid = validate(data);
    const errors = validate.errors?.map((e: ErrorObject) => formatAjvError(e)) || [];

    return { valid: valid as boolean, errors, data };
  }

  /**
   * Add a custom format to the validator
   */
  addFormat(name: string, format: string | RegExp | ((data: string) => boolean)): void {
    this.ajv.addFormat(name, format);
  }

  /**
   * Add a custom keyword to the validator
   */
  addKeyword(keyword: string, definition: any): void {
    this.ajv.addKeyword({ keyword, ...definition });
  }
}

/**
 * Format AJV error for readable output
 */
function formatAjvError(error: ErrorObject): string {
  const path = error.instancePath || 'root';
  const message = error.message || 'validation failed';
  return `${path}: ${message}`;
}

/**
 * Common JSON Schemas for IntelGraph
 */
export const CommonSchemas = {
  uuid: {
    type: 'string',
    format: 'uuid',
  },

  email: {
    type: 'string',
    format: 'email',
  },

  datetime: {
    type: 'string',
    format: 'date-time',
  },

  entity: {
    type: 'object',
    required: ['id', 'type', 'name'],
    properties: {
      id: { type: 'string', format: 'uuid' },
      type: { type: 'string' },
      name: { type: 'string' },
      description: { type: 'string' },
      properties: { type: 'object' },
      labels: { type: 'array', items: { type: 'string' } },
      confidence: { type: 'number', minimum: 0, maximum: 1 },
      source: { type: 'string' },
      createdAt: { type: 'string', format: 'date-time' },
      updatedAt: { type: 'string', format: 'date-time' },
    },
  },

  relationship: {
    type: 'object',
    required: ['id', 'type', 'sourceId', 'targetId'],
    properties: {
      id: { type: 'string', format: 'uuid' },
      type: { type: 'string' },
      sourceId: { type: 'string', format: 'uuid' },
      targetId: { type: 'string', format: 'uuid' },
      properties: { type: 'object' },
      weight: { type: 'number', minimum: 0, maximum: 1 },
      confidence: { type: 'number', minimum: 0, maximum: 1 },
      createdAt: { type: 'string', format: 'date-time' },
      updatedAt: { type: 'string', format: 'date-time' },
    },
  },

  investigation: {
    type: 'object',
    required: ['id', 'title', 'status'],
    properties: {
      id: { type: 'string', format: 'uuid' },
      title: { type: 'string', minLength: 1 },
      description: { type: 'string' },
      status: {
        type: 'string',
        enum: ['draft', 'open', 'in_progress', 'pending_review', 'closed', 'archived'],
      },
      priority: {
        type: 'string',
        enum: ['low', 'medium', 'high', 'critical', 'emergency'],
      },
      createdAt: { type: 'string', format: 'date-time' },
      updatedAt: { type: 'string', format: 'date-time' },
    },
  },

  user: {
    type: 'object',
    required: ['id', 'email', 'role'],
    properties: {
      id: { type: 'string', format: 'uuid' },
      email: { type: 'string', format: 'email' },
      username: { type: 'string' },
      firstName: { type: 'string' },
      lastName: { type: 'string' },
      role: { type: 'string', enum: ['admin', 'analyst', 'viewer', 'user'] },
      isActive: { type: 'boolean' },
      createdAt: { type: 'string', format: 'date-time' },
    },
  },

  graphqlResponse: {
    type: 'object',
    properties: {
      data: { type: ['object', 'null'] },
      errors: {
        type: 'array',
        items: {
          type: 'object',
          required: ['message'],
          properties: {
            message: { type: 'string' },
            path: { type: 'array' },
            extensions: { type: 'object' },
          },
        },
      },
    },
  },

  healthResponse: {
    type: 'object',
    required: ['status'],
    properties: {
      status: { type: 'string', enum: ['ok', 'healthy', 'degraded', 'unhealthy'] },
      version: { type: 'string' },
      uptime: { type: 'number' },
      services: {
        type: 'object',
        additionalProperties: {
          type: 'object',
          properties: {
            status: { type: 'string' },
            latency: { type: 'number' },
          },
        },
      },
    },
  },

  errorResponse: {
    type: 'object',
    required: ['error'],
    properties: {
      error: { type: 'string' },
      message: { type: 'string' },
      code: { type: 'string' },
      statusCode: { type: 'number' },
      details: { type: 'object' },
    },
  },

  paginatedResponse: (itemSchema: object) => ({
    type: 'object',
    required: ['items', 'total'],
    properties: {
      items: { type: 'array', items: itemSchema },
      total: { type: 'number', minimum: 0 },
      page: { type: 'number', minimum: 1 },
      pageSize: { type: 'number', minimum: 1 },
      hasMore: { type: 'boolean' },
    },
  }),
};

/**
 * Contract Builder for easier contract definition
 */
export class ContractBuilder {
  private contract: Partial<Contract> = {
    interactions: [],
  };

  name(name: string): this {
    this.contract.name = name;
    return this;
  }

  version(version: string): this {
    this.contract.version = version;
    return this;
  }

  provider(provider: string): this {
    this.contract.provider = provider;
    return this;
  }

  consumer(consumer: string): this {
    this.contract.consumer = consumer;
    return this;
  }

  interaction(interaction: ContractInteraction): this {
    this.contract.interactions!.push(interaction);
    return this;
  }

  get(path: string, description: string): InteractionBuilder {
    return new InteractionBuilder(this, 'GET', path, description);
  }

  post(path: string, description: string): InteractionBuilder {
    return new InteractionBuilder(this, 'POST', path, description);
  }

  put(path: string, description: string): InteractionBuilder {
    return new InteractionBuilder(this, 'PUT', path, description);
  }

  delete(path: string, description: string): InteractionBuilder {
    return new InteractionBuilder(this, 'DELETE', path, description);
  }

  build(): Contract {
    if (!this.contract.name || !this.contract.version || !this.contract.provider || !this.contract.consumer) {
      throw new Error('Contract must have name, version, provider, and consumer');
    }
    return this.contract as Contract;
  }
}

/**
 * Interaction Builder for fluent API
 */
class InteractionBuilder {
  private parent: ContractBuilder;
  private interaction: Partial<ContractInteraction>;

  constructor(
    parent: ContractBuilder,
    method: ContractRequest['method'],
    path: string,
    description: string
  ) {
    this.parent = parent;
    this.interaction = {
      description,
      request: { method, path },
      response: { status: 200 },
    };
  }

  withRequestHeaders(headers: Record<string, string>): this {
    this.interaction.request!.headers = headers;
    return this;
  }

  withRequestBody(body: any, schema?: object): this {
    this.interaction.request!.body = body;
    if (schema) {
      this.interaction.request!.bodySchema = schema;
    }
    return this;
  }

  willRespondWith(status: number, body?: any, schema?: object): ContractBuilder {
    this.interaction.response = {
      status,
      body,
      bodySchema: schema,
    };
    this.parent.interaction(this.interaction as ContractInteraction);
    return this.parent;
  }
}

/**
 * Create a new contract builder
 */
export function defineContract(): ContractBuilder {
  return new ContractBuilder();
}

export default ContractVerifier;
