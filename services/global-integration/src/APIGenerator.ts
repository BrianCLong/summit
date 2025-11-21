/**
 * API Generator Service
 *
 * Auto-generates compliant, secure APIs and integration layers
 * for global partners with multi-language support.
 */

import type {
  GlobalPartner,
  IntegrationLayer,
  APISpecification,
  TranslationMapping,
} from './types';

export interface GeneratorConfig {
  defaultVersion: string;
  enableGraphQL: boolean;
  enableREST: boolean;
  enableGRPC: boolean;
  securityLevel: 'standard' | 'high' | 'maximum';
  translationService?: string;
}

export interface GeneratedAPI {
  partnerId: string;
  graphql?: GeneratedGraphQL;
  rest?: GeneratedREST;
  grpc?: GeneratedGRPC;
  compliance: GeneratedCompliancePolicy;
  translations: TranslationMapping[];
  documentation: GeneratedDocs;
}

export interface GeneratedGraphQL {
  schema: string;
  resolvers: string;
  directives: string[];
  federationConfig?: string;
}

export interface GeneratedREST {
  openapi: string;
  routes: string;
  middleware: string[];
  validation: string;
}

export interface GeneratedGRPC {
  proto: string;
  service: string;
}

export interface GeneratedCompliancePolicy {
  opa: string;
  rbac: string;
  dataClassification: string;
}

export interface GeneratedDocs {
  readme: string;
  apiReference: string;
  integrationGuide: string;
  changelog: string;
}

export class APIGeneratorService {
  private config: GeneratorConfig;

  constructor(config: Partial<GeneratorConfig> = {}) {
    this.config = {
      defaultVersion: '1.0.0',
      enableGraphQL: true,
      enableREST: true,
      enableGRPC: false,
      securityLevel: 'high',
      ...config,
    };
  }

  /**
   * Generate complete API integration for a partner
   */
  async generateAPI(
    partner: GlobalPartner,
    apiSpec?: APISpecification
  ): Promise<GeneratedAPI> {
    console.log(`[APIGenerator] Generating API for ${partner.name}...`);

    const result: GeneratedAPI = {
      partnerId: partner.id,
      compliance: await this.generateCompliancePolicy(partner),
      translations: await this.generateTranslations(partner),
      documentation: await this.generateDocumentation(partner),
    };

    if (this.config.enableGraphQL) {
      result.graphql = await this.generateGraphQL(partner, apiSpec);
    }

    if (this.config.enableREST) {
      result.rest = await this.generateREST(partner, apiSpec);
    }

    if (this.config.enableGRPC) {
      result.grpc = await this.generateGRPC(partner, apiSpec);
    }

    return result;
  }

  /**
   * Generate GraphQL schema and resolvers
   */
  private async generateGraphQL(
    partner: GlobalPartner,
    apiSpec?: APISpecification
  ): Promise<GeneratedGraphQL> {
    const typeName = this.sanitizeName(partner.name);

    const schema = `
# ==================================================
# Auto-generated GraphQL Schema
# Partner: ${partner.name}
# Region: ${partner.region}
# Generated: ${new Date().toISOString()}
# ==================================================

"""
${partner.name} entity from ${partner.country}
Compliance: ${partner.complianceRequirements.join(', ')}
"""
type ${typeName}Entity @key(fields: "id") {
  """Unique identifier"""
  id: ID!

  """External identifier from source system"""
  externalId: String!

  """Localized name (use Accept-Language header)"""
  name: String! @localized

  """Entity type classification"""
  type: ${typeName}EntityType!

  """Dynamic attributes"""
  attributes: JSON

  """Classification and compliance metadata"""
  metadata: ${typeName}Metadata!

  """Audit timestamps"""
  createdAt: DateTime!
  updatedAt: DateTime!
}

enum ${typeName}EntityType {
  ORGANIZATION
  PERSON
  DOCUMENT
  LOCATION
  EVENT
  ASSET
}

type ${typeName}Metadata {
  """Source system identifier"""
  source: String!

  """Data classification level"""
  classification: DataClassification!

  """Original language code (ISO 639-1)"""
  language: String!

  """Applicable compliance frameworks"""
  complianceFrameworks: [ComplianceFramework!]!

  """Data quality score (0-100)"""
  qualityScore: Int

  """Last sync timestamp"""
  lastSyncAt: DateTime
}

"""Paginated connection for ${typeName} entities"""
type ${typeName}Connection {
  edges: [${typeName}Edge!]!
  pageInfo: PageInfo!
  totalCount: Int!
}

type ${typeName}Edge {
  node: ${typeName}Entity!
  cursor: String!
}

"""Query input for ${typeName} entities"""
input ${typeName}QueryInput {
  """Filter criteria"""
  filter: ${typeName}Filter

  """Sort order"""
  sort: ${typeName}Sort

  """Pagination"""
  pagination: PaginationInput

  """Override response language"""
  language: String

  """Include soft-deleted records"""
  includeDeleted: Boolean
}

input ${typeName}Filter {
  """Filter by IDs"""
  ids: [ID!]

  """Filter by external IDs"""
  externalIds: [String!]

  """Filter by entity types"""
  types: [${typeName}EntityType!]

  """Full-text search query"""
  search: String

  """Date range filter"""
  dateRange: DateRangeInput

  """Classification level filter"""
  classifications: [DataClassification!]
}

input ${typeName}Sort {
  field: ${typeName}SortField!
  direction: SortDirection!
}

enum ${typeName}SortField {
  NAME
  CREATED_AT
  UPDATED_AT
  TYPE
  QUALITY_SCORE
}

"""Mutation input for creating ${typeName} entity"""
input Create${typeName}Input {
  externalId: String!
  name: String!
  type: ${typeName}EntityType!
  attributes: JSON
  language: String
}

"""Mutation input for updating ${typeName} entity"""
input Update${typeName}Input {
  name: String
  type: ${typeName}EntityType
  attributes: JSON
}

"""Result of batch import operation"""
type ${typeName}ImportResult {
  """Number of successfully imported entities"""
  imported: Int!

  """Number of failed imports"""
  failed: Int!

  """Import errors"""
  errors: [ImportError!]!

  """Import job ID for tracking"""
  jobId: String!
}

"""Sync status information"""
type ${typeName}SyncStatus {
  """Last successful sync"""
  lastSync: DateTime

  """Next scheduled sync"""
  nextSync: DateTime

  """Current sync status"""
  status: SyncStatusEnum!

  """Number of pending changes"""
  pendingChanges: Int

  """Sync error message if any"""
  errorMessage: String
}

enum SyncStatusEnum {
  IDLE
  SYNCING
  ERROR
  DISABLED
}

# ==================================================
# Query Extensions
# ==================================================

extend type Query {
  """Get a single ${typeName} entity by ID"""
  ${this.camelCase(typeName)}(
    id: ID!
    """Response language (ISO 639-1)"""
    language: String
  ): ${typeName}Entity @auth(requires: VIEWER)

  """List ${typeName} entities with filtering and pagination"""
  ${this.camelCase(typeName)}s(
    input: ${typeName}QueryInput
  ): ${typeName}Connection! @auth(requires: VIEWER)

  """Search ${typeName} entities across all fields"""
  ${this.camelCase(typeName)}Search(
    """Search query"""
    query: String!
    """Response language"""
    language: String
    """Maximum results"""
    limit: Int = 20
  ): [${typeName}Entity!]! @auth(requires: VIEWER)

  """Get sync status for ${typeName} integration"""
  ${this.camelCase(typeName)}SyncStatus: ${typeName}SyncStatus! @auth(requires: ANALYST)
}

# ==================================================
# Mutation Extensions
# ==================================================

extend type Mutation {
  """Create a new ${typeName} entity"""
  create${typeName}(
    input: Create${typeName}Input!
  ): ${typeName}Entity! @auth(requires: ANALYST) @audit(action: CREATE)

  """Update an existing ${typeName} entity"""
  update${typeName}(
    id: ID!
    input: Update${typeName}Input!
  ): ${typeName}Entity! @auth(requires: ANALYST) @audit(action: UPDATE)

  """Delete a ${typeName} entity"""
  delete${typeName}(
    id: ID!
    """Hard delete (requires ADMIN)"""
    hard: Boolean = false
  ): Boolean! @auth(requires: SUPERVISOR) @audit(action: DELETE)

  """Trigger sync from ${partner.name}"""
  sync${typeName}(
    """Sync mode"""
    mode: SyncMode = INCREMENTAL
    """Sync from date (for incremental)"""
    since: DateTime
  ): ${typeName}SyncStatus! @auth(requires: ANALYST) @audit(action: SYNC)

  """Import entities in batch"""
  import${typeName}Batch(
    """External IDs to import"""
    externalIds: [String!]!
    """Skip existing entities"""
    skipExisting: Boolean = true
  ): ${typeName}ImportResult! @auth(requires: ANALYST) @audit(action: IMPORT)
}

enum SyncMode {
  FULL
  INCREMENTAL
  DELTA
}

# ==================================================
# Subscription Extensions
# ==================================================

extend type Subscription {
  """Subscribe to ${typeName} entity changes"""
  ${this.camelCase(typeName)}Changed(
    """Filter by entity types"""
    types: [${typeName}EntityType!]
  ): ${typeName}EntityChange! @auth(requires: VIEWER)
}

type ${typeName}EntityChange {
  """Change type"""
  changeType: ChangeType!

  """Changed entity"""
  entity: ${typeName}Entity!

  """Change timestamp"""
  timestamp: DateTime!

  """User who made the change"""
  changedBy: String
}

enum ChangeType {
  CREATED
  UPDATED
  DELETED
  SYNCED
}
`;

    const resolvers = `
// Auto-generated resolvers for ${partner.name}
// Generated: ${new Date().toISOString()}

import { AuthenticationError, ForbiddenError } from 'apollo-server-errors';
import { GraphQLResolveInfo } from 'graphql';

export const ${this.camelCase(typeName)}Resolvers = {
  Query: {
    ${this.camelCase(typeName)}: async (
      _parent: unknown,
      { id, language }: { id: string; language?: string },
      context: Context,
      info: GraphQLResolveInfo
    ) => {
      // Authorization check
      await context.authorize('${this.camelCase(typeName)}:read');

      // Fetch entity
      const entity = await context.dataSources.${this.camelCase(typeName)}API.getById(id);

      // Apply localization
      if (language && language !== entity.metadata.language) {
        return context.services.translation.translate(entity, language);
      }

      return entity;
    },

    ${this.camelCase(typeName)}s: async (
      _parent: unknown,
      { input }: { input: ${typeName}QueryInput },
      context: Context
    ) => {
      await context.authorize('${this.camelCase(typeName)}:list');

      const { filter, sort, pagination, language } = input || {};

      const result = await context.dataSources.${this.camelCase(typeName)}API.list({
        filter,
        sort,
        pagination,
      });

      // Apply localization if requested
      if (language) {
        result.edges = await Promise.all(
          result.edges.map(async (edge) => ({
            ...edge,
            node: await context.services.translation.translate(edge.node, language),
          }))
        );
      }

      return result;
    },

    ${this.camelCase(typeName)}Search: async (
      _parent: unknown,
      { query, language, limit }: { query: string; language?: string; limit: number },
      context: Context
    ) => {
      await context.authorize('${this.camelCase(typeName)}:search');

      return context.dataSources.${this.camelCase(typeName)}API.search(query, {
        language,
        limit,
      });
    },

    ${this.camelCase(typeName)}SyncStatus: async (
      _parent: unknown,
      _args: unknown,
      context: Context
    ) => {
      await context.authorize('${this.camelCase(typeName)}:admin');

      return context.dataSources.${this.camelCase(typeName)}API.getSyncStatus();
    },
  },

  Mutation: {
    create${typeName}: async (
      _parent: unknown,
      { input }: { input: Create${typeName}Input },
      context: Context
    ) => {
      await context.authorize('${this.camelCase(typeName)}:create');

      // Validate input
      await context.services.validation.validate(input, '${typeName}CreateSchema');

      // Create entity
      const entity = await context.dataSources.${this.camelCase(typeName)}API.create(input);

      // Emit event
      context.pubsub.publish('${typeName.toUpperCase()}_CHANGED', {
        ${this.camelCase(typeName)}Changed: {
          changeType: 'CREATED',
          entity,
          timestamp: new Date(),
          changedBy: context.user.id,
        },
      });

      return entity;
    },

    sync${typeName}: async (
      _parent: unknown,
      { mode, since }: { mode: string; since?: Date },
      context: Context
    ) => {
      await context.authorize('${this.camelCase(typeName)}:sync');

      return context.dataSources.${this.camelCase(typeName)}API.triggerSync(mode, since);
    },
  },

  Subscription: {
    ${this.camelCase(typeName)}Changed: {
      subscribe: (
        _parent: unknown,
        { types }: { types?: string[] },
        context: Context
      ) => {
        context.authorize('${this.camelCase(typeName)}:subscribe');

        return context.pubsub.asyncIterator(['${typeName.toUpperCase()}_CHANGED']);
      },
    },
  },

  ${typeName}Entity: {
    __resolveReference: async (
      reference: { id: string },
      context: Context
    ) => {
      return context.dataSources.${this.camelCase(typeName)}API.getById(reference.id);
    },
  },
};
`;

    return {
      schema,
      resolvers,
      directives: ['@auth', '@audit', '@localized', '@key'],
      federationConfig: this.generateFederationConfig(partner),
    };
  }

  /**
   * Generate GraphQL Federation config
   */
  private generateFederationConfig(partner: GlobalPartner): string {
    const typeName = this.sanitizeName(partner.name);

    return JSON.stringify(
      {
        name: `${this.camelCase(typeName)}-subgraph`,
        url: `http://integration-${partner.id}:4000/graphql`,
        schema: `./schemas/${typeName}.graphql`,
        extends: ['Query', 'Mutation', 'Subscription'],
      },
      null,
      2
    );
  }

  /**
   * Generate REST API (OpenAPI) specification
   */
  private async generateREST(
    partner: GlobalPartner,
    apiSpec?: APISpecification
  ): Promise<GeneratedREST> {
    const pathPrefix = `/api/v1/integrations/${partner.id}`;
    const typeName = this.sanitizeName(partner.name);

    const openapi = {
      openapi: '3.1.0',
      info: {
        title: `${partner.name} Integration API`,
        version: this.config.defaultVersion,
        description: `Auto-generated REST API for ${partner.name} integration.\n\nRegion: ${partner.region}\nCountry: ${partner.country}\nCompliance: ${partner.complianceRequirements.join(', ')}`,
        contact: {
          name: 'IntelGraph Integration Team',
          email: 'integrations@intelgraph.io',
        },
        license: {
          name: 'Proprietary',
          url: 'https://intelgraph.io/terms',
        },
      },
      servers: [
        {
          url: '{baseUrl}',
          description: 'Integration server',
          variables: {
            baseUrl: {
              default: 'https://api.intelgraph.io',
              description: 'Base URL for the API',
            },
          },
        },
      ],
      tags: [
        {
          name: 'Entities',
          description: `${partner.name} entity operations`,
        },
        {
          name: 'Sync',
          description: 'Synchronization operations',
        },
        {
          name: 'Admin',
          description: 'Administrative operations',
        },
      ],
      paths: {
        [`${pathPrefix}/entities`]: {
          get: {
            operationId: `list${typeName}Entities`,
            summary: `List ${partner.name} entities`,
            tags: ['Entities'],
            parameters: [
              {
                name: 'page',
                in: 'query',
                schema: { type: 'integer', default: 1, minimum: 1 },
                description: 'Page number',
              },
              {
                name: 'limit',
                in: 'query',
                schema: { type: 'integer', default: 20, minimum: 1, maximum: 100 },
                description: 'Items per page',
              },
              {
                name: 'sort',
                in: 'query',
                schema: { type: 'string', enum: ['name', 'createdAt', 'updatedAt'] },
                description: 'Sort field',
              },
              {
                name: 'order',
                in: 'query',
                schema: { type: 'string', enum: ['asc', 'desc'], default: 'asc' },
                description: 'Sort order',
              },
              {
                name: 'Accept-Language',
                in: 'header',
                schema: { type: 'string', default: partner.languageCode },
                description: 'Response language (ISO 639-1)',
              },
            ],
            responses: {
              '200': {
                description: 'List of entities',
                content: {
                  'application/json': {
                    schema: { $ref: `#/components/schemas/${typeName}List` },
                  },
                },
              },
              '401': { $ref: '#/components/responses/Unauthorized' },
              '403': { $ref: '#/components/responses/Forbidden' },
            },
            security: [{ bearerAuth: [] }, { apiKey: [] }],
          },
          post: {
            operationId: `create${typeName}Entity`,
            summary: `Create ${partner.name} entity`,
            tags: ['Entities'],
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: { $ref: `#/components/schemas/Create${typeName}Input` },
                },
              },
            },
            responses: {
              '201': {
                description: 'Entity created',
                content: {
                  'application/json': {
                    schema: { $ref: `#/components/schemas/${typeName}Entity` },
                  },
                },
              },
              '400': { $ref: '#/components/responses/BadRequest' },
              '401': { $ref: '#/components/responses/Unauthorized' },
              '403': { $ref: '#/components/responses/Forbidden' },
            },
            security: [{ bearerAuth: [] }],
          },
        },
        [`${pathPrefix}/entities/{id}`]: {
          get: {
            operationId: `get${typeName}Entity`,
            summary: `Get ${partner.name} entity by ID`,
            tags: ['Entities'],
            parameters: [
              {
                name: 'id',
                in: 'path',
                required: true,
                schema: { type: 'string', format: 'uuid' },
                description: 'Entity ID',
              },
            ],
            responses: {
              '200': {
                description: 'Entity details',
                content: {
                  'application/json': {
                    schema: { $ref: `#/components/schemas/${typeName}Entity` },
                  },
                },
              },
              '404': { $ref: '#/components/responses/NotFound' },
            },
            security: [{ bearerAuth: [] }, { apiKey: [] }],
          },
          patch: {
            operationId: `update${typeName}Entity`,
            summary: `Update ${partner.name} entity`,
            tags: ['Entities'],
            parameters: [
              {
                name: 'id',
                in: 'path',
                required: true,
                schema: { type: 'string', format: 'uuid' },
              },
            ],
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: { $ref: `#/components/schemas/Update${typeName}Input` },
                },
              },
            },
            responses: {
              '200': {
                description: 'Entity updated',
                content: {
                  'application/json': {
                    schema: { $ref: `#/components/schemas/${typeName}Entity` },
                  },
                },
              },
            },
            security: [{ bearerAuth: [] }],
          },
          delete: {
            operationId: `delete${typeName}Entity`,
            summary: `Delete ${partner.name} entity`,
            tags: ['Entities'],
            parameters: [
              {
                name: 'id',
                in: 'path',
                required: true,
                schema: { type: 'string', format: 'uuid' },
              },
            ],
            responses: {
              '204': { description: 'Entity deleted' },
              '404': { $ref: '#/components/responses/NotFound' },
            },
            security: [{ bearerAuth: [] }],
          },
        },
        [`${pathPrefix}/sync`]: {
          post: {
            operationId: `sync${typeName}`,
            summary: `Trigger sync from ${partner.name}`,
            tags: ['Sync'],
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/SyncRequest' },
                },
              },
            },
            responses: {
              '202': {
                description: 'Sync initiated',
                content: {
                  'application/json': {
                    schema: { $ref: '#/components/schemas/SyncResponse' },
                  },
                },
              },
            },
            security: [{ bearerAuth: [] }],
          },
        },
        [`${pathPrefix}/sync/status`]: {
          get: {
            operationId: `get${typeName}SyncStatus`,
            summary: 'Get sync status',
            tags: ['Sync'],
            responses: {
              '200': {
                description: 'Sync status',
                content: {
                  'application/json': {
                    schema: { $ref: '#/components/schemas/SyncStatus' },
                  },
                },
              },
            },
            security: [{ bearerAuth: [] }],
          },
        },
      },
      components: {
        schemas: this.generateOpenAPISchemas(partner),
        responses: {
          BadRequest: {
            description: 'Bad request',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
          Unauthorized: {
            description: 'Unauthorized',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
          Forbidden: {
            description: 'Forbidden',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
          NotFound: {
            description: 'Not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
        },
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
          },
          apiKey: {
            type: 'apiKey',
            in: 'header',
            name: 'X-API-Key',
          },
        },
      },
    };

    const routes = this.generateExpressRoutes(partner);
    const validation = this.generateValidationSchema(partner);

    return {
      openapi: JSON.stringify(openapi, null, 2),
      routes,
      middleware: ['auth', 'rateLimit', 'audit', 'translation'],
      validation,
    };
  }

  /**
   * Generate OpenAPI component schemas
   */
  private generateOpenAPISchemas(partner: GlobalPartner): Record<string, unknown> {
    const typeName = this.sanitizeName(partner.name);

    return {
      [`${typeName}Entity`]: {
        type: 'object',
        required: ['id', 'externalId', 'name', 'type', 'metadata'],
        properties: {
          id: { type: 'string', format: 'uuid' },
          externalId: { type: 'string' },
          name: { type: 'string' },
          type: { type: 'string', enum: ['ORGANIZATION', 'PERSON', 'DOCUMENT', 'LOCATION', 'EVENT', 'ASSET'] },
          attributes: { type: 'object', additionalProperties: true },
          metadata: { $ref: `#/components/schemas/${typeName}Metadata` },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      [`${typeName}Metadata`]: {
        type: 'object',
        properties: {
          source: { type: 'string' },
          classification: { type: 'string', enum: ['public', 'internal', 'confidential', 'restricted'] },
          language: { type: 'string' },
          complianceFrameworks: { type: 'array', items: { type: 'string' } },
          qualityScore: { type: 'integer', minimum: 0, maximum: 100 },
          lastSyncAt: { type: 'string', format: 'date-time' },
        },
      },
      [`${typeName}List`]: {
        type: 'object',
        properties: {
          data: { type: 'array', items: { $ref: `#/components/schemas/${typeName}Entity` } },
          pagination: { $ref: '#/components/schemas/Pagination' },
        },
      },
      [`Create${typeName}Input`]: {
        type: 'object',
        required: ['externalId', 'name', 'type'],
        properties: {
          externalId: { type: 'string' },
          name: { type: 'string' },
          type: { type: 'string' },
          attributes: { type: 'object' },
          language: { type: 'string' },
        },
      },
      [`Update${typeName}Input`]: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          type: { type: 'string' },
          attributes: { type: 'object' },
        },
      },
      Pagination: {
        type: 'object',
        properties: {
          page: { type: 'integer' },
          limit: { type: 'integer' },
          total: { type: 'integer' },
          hasMore: { type: 'boolean' },
        },
      },
      SyncRequest: {
        type: 'object',
        properties: {
          mode: { type: 'string', enum: ['full', 'incremental', 'delta'] },
          since: { type: 'string', format: 'date-time' },
        },
      },
      SyncResponse: {
        type: 'object',
        properties: {
          jobId: { type: 'string' },
          status: { type: 'string' },
          estimatedCompletion: { type: 'string', format: 'date-time' },
        },
      },
      SyncStatus: {
        type: 'object',
        properties: {
          lastSync: { type: 'string', format: 'date-time' },
          nextSync: { type: 'string', format: 'date-time' },
          status: { type: 'string', enum: ['idle', 'syncing', 'error', 'disabled'] },
          pendingChanges: { type: 'integer' },
          errorMessage: { type: 'string' },
        },
      },
      Error: {
        type: 'object',
        properties: {
          code: { type: 'string' },
          message: { type: 'string' },
          details: { type: 'object' },
        },
      },
    };
  }

  /**
   * Generate Express routes
   */
  private generateExpressRoutes(partner: GlobalPartner): string {
    const typeName = this.sanitizeName(partner.name);
    const camelName = this.camelCase(typeName);

    return `
// Auto-generated Express routes for ${partner.name}
import { Router } from 'express';
import { ${camelName}Controller } from './controllers/${camelName}Controller';
import { authenticate, authorize } from '../middleware/auth';
import { rateLimit } from '../middleware/rateLimit';
import { audit } from '../middleware/audit';
import { validateRequest } from '../middleware/validation';
import { translate } from '../middleware/translation';

const router = Router();

// Apply common middleware
router.use(authenticate);
router.use(rateLimit('${partner.id}'));

// Entity routes
router.get('/entities',
  authorize('${camelName}:list'),
  translate,
  ${camelName}Controller.list
);

router.get('/entities/:id',
  authorize('${camelName}:read'),
  translate,
  ${camelName}Controller.getById
);

router.post('/entities',
  authorize('${camelName}:create'),
  validateRequest('Create${typeName}Input'),
  audit('CREATE', '${typeName}'),
  ${camelName}Controller.create
);

router.patch('/entities/:id',
  authorize('${camelName}:update'),
  validateRequest('Update${typeName}Input'),
  audit('UPDATE', '${typeName}'),
  ${camelName}Controller.update
);

router.delete('/entities/:id',
  authorize('${camelName}:delete'),
  audit('DELETE', '${typeName}'),
  ${camelName}Controller.delete
);

// Sync routes
router.post('/sync',
  authorize('${camelName}:sync'),
  validateRequest('SyncRequest'),
  audit('SYNC', '${typeName}'),
  ${camelName}Controller.sync
);

router.get('/sync/status',
  authorize('${camelName}:admin'),
  ${camelName}Controller.getSyncStatus
);

export default router;
`;
  }

  /**
   * Generate validation schema
   */
  private generateValidationSchema(partner: GlobalPartner): string {
    const typeName = this.sanitizeName(partner.name);

    return `
// Auto-generated validation schemas for ${partner.name}
import { z } from 'zod';

export const Create${typeName}InputSchema = z.object({
  externalId: z.string().min(1).max(255),
  name: z.string().min(1).max(500),
  type: z.enum(['ORGANIZATION', 'PERSON', 'DOCUMENT', 'LOCATION', 'EVENT', 'ASSET']),
  attributes: z.record(z.unknown()).optional(),
  language: z.string().length(2).optional(),
});

export const Update${typeName}InputSchema = z.object({
  name: z.string().min(1).max(500).optional(),
  type: z.enum(['ORGANIZATION', 'PERSON', 'DOCUMENT', 'LOCATION', 'EVENT', 'ASSET']).optional(),
  attributes: z.record(z.unknown()).optional(),
});

export const SyncRequestSchema = z.object({
  mode: z.enum(['full', 'incremental', 'delta']).default('incremental'),
  since: z.string().datetime().optional(),
});
`;
  }

  /**
   * Generate gRPC proto and service (if enabled)
   */
  private async generateGRPC(
    partner: GlobalPartner,
    apiSpec?: APISpecification
  ): Promise<GeneratedGRPC> {
    const typeName = this.sanitizeName(partner.name);

    const proto = `
syntax = "proto3";

package intelgraph.integration.${typeName.toLowerCase()};

option go_package = "github.com/intelgraph/integration/${typeName.toLowerCase()}";

import "google/protobuf/timestamp.proto";
import "google/protobuf/struct.proto";

// ${partner.name} Integration Service
service ${typeName}Service {
  // Get entity by ID
  rpc GetEntity(GetEntityRequest) returns (Entity);

  // List entities with pagination
  rpc ListEntities(ListEntitiesRequest) returns (ListEntitiesResponse);

  // Search entities
  rpc SearchEntities(SearchEntitiesRequest) returns (SearchEntitiesResponse);

  // Create entity
  rpc CreateEntity(CreateEntityRequest) returns (Entity);

  // Update entity
  rpc UpdateEntity(UpdateEntityRequest) returns (Entity);

  // Delete entity
  rpc DeleteEntity(DeleteEntityRequest) returns (DeleteEntityResponse);

  // Trigger sync
  rpc TriggerSync(TriggerSyncRequest) returns (SyncStatus);

  // Stream entity changes
  rpc StreamChanges(StreamChangesRequest) returns (stream EntityChange);
}

message Entity {
  string id = 1;
  string external_id = 2;
  string name = 3;
  EntityType type = 4;
  google.protobuf.Struct attributes = 5;
  Metadata metadata = 6;
  google.protobuf.Timestamp created_at = 7;
  google.protobuf.Timestamp updated_at = 8;
}

enum EntityType {
  ENTITY_TYPE_UNSPECIFIED = 0;
  ORGANIZATION = 1;
  PERSON = 2;
  DOCUMENT = 3;
  LOCATION = 4;
  EVENT = 5;
  ASSET = 6;
}

message Metadata {
  string source = 1;
  DataClassification classification = 2;
  string language = 3;
  repeated string compliance_frameworks = 4;
  int32 quality_score = 5;
  google.protobuf.Timestamp last_sync_at = 6;
}

enum DataClassification {
  DATA_CLASSIFICATION_UNSPECIFIED = 0;
  PUBLIC = 1;
  INTERNAL = 2;
  CONFIDENTIAL = 3;
  RESTRICTED = 4;
}

message GetEntityRequest {
  string id = 1;
  string language = 2;
}

message ListEntitiesRequest {
  int32 page = 1;
  int32 limit = 2;
  string sort_field = 3;
  SortDirection sort_direction = 4;
  EntityFilter filter = 5;
  string language = 6;
}

enum SortDirection {
  SORT_DIRECTION_UNSPECIFIED = 0;
  ASC = 1;
  DESC = 2;
}

message EntityFilter {
  repeated string ids = 1;
  repeated string external_ids = 2;
  repeated EntityType types = 3;
  string search = 4;
  google.protobuf.Timestamp created_after = 5;
  google.protobuf.Timestamp created_before = 6;
}

message ListEntitiesResponse {
  repeated Entity entities = 1;
  Pagination pagination = 2;
}

message Pagination {
  int32 page = 1;
  int32 limit = 2;
  int32 total = 3;
  bool has_more = 4;
}

message SearchEntitiesRequest {
  string query = 1;
  string language = 2;
  int32 limit = 3;
}

message SearchEntitiesResponse {
  repeated Entity entities = 1;
}

message CreateEntityRequest {
  string external_id = 1;
  string name = 2;
  EntityType type = 3;
  google.protobuf.Struct attributes = 4;
  string language = 5;
}

message UpdateEntityRequest {
  string id = 1;
  string name = 2;
  EntityType type = 3;
  google.protobuf.Struct attributes = 4;
}

message DeleteEntityRequest {
  string id = 1;
  bool hard = 2;
}

message DeleteEntityResponse {
  bool success = 1;
}

message TriggerSyncRequest {
  SyncMode mode = 1;
  google.protobuf.Timestamp since = 2;
}

enum SyncMode {
  SYNC_MODE_UNSPECIFIED = 0;
  FULL = 1;
  INCREMENTAL = 2;
  DELTA = 3;
}

message SyncStatus {
  google.protobuf.Timestamp last_sync = 1;
  google.protobuf.Timestamp next_sync = 2;
  SyncStatusEnum status = 3;
  int32 pending_changes = 4;
  string error_message = 5;
}

enum SyncStatusEnum {
  SYNC_STATUS_UNSPECIFIED = 0;
  IDLE = 1;
  SYNCING = 2;
  ERROR = 3;
  DISABLED = 4;
}

message StreamChangesRequest {
  repeated EntityType types = 1;
}

message EntityChange {
  ChangeType change_type = 1;
  Entity entity = 2;
  google.protobuf.Timestamp timestamp = 3;
  string changed_by = 4;
}

enum ChangeType {
  CHANGE_TYPE_UNSPECIFIED = 0;
  CREATED = 1;
  UPDATED = 2;
  DELETED = 3;
  SYNCED = 4;
}
`;

    return {
      proto,
      service: `${typeName}Service`,
    };
  }

  /**
   * Generate compliance policy
   */
  private async generateCompliancePolicy(
    partner: GlobalPartner
  ): Promise<GeneratedCompliancePolicy> {
    const typeName = this.sanitizeName(partner.name);
    const packageName = typeName.toLowerCase();

    const opa = `
# Auto-generated OPA policy for ${partner.name}
# Compliance frameworks: ${partner.complianceRequirements.join(', ')}
# Data classification: ${partner.dataClassification}

package global_integration.${packageName}

import future.keywords.in
import future.keywords.if
import future.keywords.every

default allow := false

# ===========================================
# Authorization Rules
# ===========================================

allow if {
    valid_authentication
    authorized_action
    compliance_satisfied
    data_classification_allowed
}

# Authentication validation
valid_authentication if {
    input.token != null
    not token_expired
    not token_revoked
}

token_expired if {
    input.token.exp < time.now_ns() / 1000000000
}

token_revoked if {
    input.token.jti in data.revoked_tokens
}

# Action authorization based on roles
authorized_action if {
    required_role := action_roles[input.action]
    input.user.roles[_] == required_role
}

action_roles := {
    "read": "viewer",
    "list": "viewer",
    "search": "viewer",
    "create": "analyst",
    "update": "analyst",
    "delete": "supervisor",
    "sync": "analyst",
    "admin": "admin",
}

# ===========================================
# Compliance Rules
# ===========================================

compliance_satisfied if {
    required_frameworks := ${JSON.stringify(partner.complianceRequirements)}
    every framework in required_frameworks {
        framework_compliant(framework)
    }
}

framework_compliant(framework) if {
    framework == "GDPR"
    gdpr_compliant
}

framework_compliant(framework) if {
    framework == "eIDAS"
    eidas_compliant
}

framework_compliant(framework) if {
    framework not in ["GDPR", "eIDAS"]
    # Other frameworks default to compliant
}

# GDPR compliance checks
gdpr_compliant if {
    # Data processing must have legal basis
    input.processing_purpose in data.legal_bases

    # Cross-border transfers must be authorized
    cross_border_transfer_allowed

    # Data minimization principle
    data_minimization_satisfied
}

cross_border_transfer_allowed if {
    # Same region
    input.user.region == "${partner.region}"
}

cross_border_transfer_allowed if {
    # EU adequacy decision countries
    input.user.region in ["EU", "Nordic", "Baltic", "NA"]
    "${partner.region}" in ["EU", "Nordic", "Baltic"]
}

cross_border_transfer_allowed if {
    # Standard contractual clauses in place
    input.user.scc_agreement == true
}

data_minimization_satisfied if {
    # Only requested fields are returned
    count(input.requested_fields) <= 20
}

# eIDAS compliance checks
eidas_compliant if {
    # Qualified authentication required for high assurance
    input.assurance_level in ["substantial", "high"]
}

# ===========================================
# Data Classification Rules
# ===========================================

data_classification_allowed if {
    input.resource.classification == "public"
}

data_classification_allowed if {
    input.resource.classification == "internal"
    input.user.clearance_level >= 1
}

data_classification_allowed if {
    input.resource.classification == "confidential"
    input.user.clearance_level >= 2
}

data_classification_allowed if {
    input.resource.classification == "restricted"
    input.user.clearance_level >= 3
    input.user.need_to_know == true
}

# ===========================================
# PII Handling Rules
# ===========================================

pii_fields := [
    "name", "email", "phone", "address",
    "national_id", "date_of_birth", "passport_number",
    "bank_account", "tax_id", "ip_address"
]

mask_pii if {
    not input.user.pii_access
}

mask_pii if {
    input.export == true
    not input.user.export_pii_permission
}

# Fields to mask in response
masked_fields[field] if {
    mask_pii
    field := pii_fields[_]
    field in input.response_fields
}

# ===========================================
# Audit Requirements
# ===========================================

audit_required := true if {
    input.action in ["create", "update", "delete", "sync", "export"]
}

audit_required := true if {
    input.resource.classification in ["confidential", "restricted"]
}

audit_required := true if {
    input.bulk_operation == true
}

audit_level := "forensic" if {
    input.resource.classification == "restricted"
}

audit_level := "detailed" if {
    input.resource.classification == "confidential"
}

audit_level := "standard" if {
    input.resource.classification in ["public", "internal"]
}

# ===========================================
# Rate Limiting Rules
# ===========================================

rate_limit_exceeded if {
    tier := input.user.tier
    limit := rate_limits[tier]
    input.request_count_minute > limit.per_minute
}

rate_limit_exceeded if {
    tier := input.user.tier
    limit := rate_limits[tier]
    input.request_count_hour > limit.per_hour
}

rate_limits := {
    "free": {"per_minute": 10, "per_hour": 100},
    "standard": {"per_minute": 100, "per_hour": 1000},
    "premium": {"per_minute": 500, "per_hour": 5000},
    "enterprise": {"per_minute": 1000, "per_hour": 50000},
}
`;

    const rbac = `
# RBAC configuration for ${partner.name}
# Auto-generated

roles:
  viewer:
    description: "Read-only access"
    permissions:
      - ${packageName}:read
      - ${packageName}:list
      - ${packageName}:search

  analyst:
    description: "Create and update access"
    inherits: viewer
    permissions:
      - ${packageName}:create
      - ${packageName}:update
      - ${packageName}:sync

  supervisor:
    description: "Full CRUD access"
    inherits: analyst
    permissions:
      - ${packageName}:delete
      - ${packageName}:export
      - ${packageName}:audit:read

  admin:
    description: "Administrative access"
    inherits: supervisor
    permissions:
      - ${packageName}:admin
      - ${packageName}:config
      - ${packageName}:*
`;

    const dataClassification = `
# Data classification policy for ${partner.name}
# Classification level: ${partner.dataClassification}

classification:
  level: ${partner.dataClassification}

  handling:
    storage:
      encryption: AES-256-GCM
      key_rotation: 90d

    transit:
      protocol: TLS 1.3
      certificate: required

    access:
      authentication: required
      authorization: RBAC + ABAC
      mfa: ${partner.dataClassification === 'restricted' ? 'required' : 'recommended'}

    retention:
      default: ${partner.dataClassification === 'restricted' ? '7y' : '3y'}
      after_deletion: 90d

    audit:
      level: ${partner.dataClassification === 'restricted' ? 'forensic' : 'standard'}
      retention: ${partner.dataClassification === 'restricted' ? '10y' : '5y'}

  cross_border:
    allowed_regions: [EU, Nordic, Baltic]
    requires_scc: ${partner.region !== 'EU'}
    requires_approval: ${partner.dataClassification === 'restricted'}
`;

    return {
      opa,
      rbac,
      dataClassification,
    };
  }

  /**
   * Generate translation mappings
   */
  private async generateTranslations(
    partner: GlobalPartner
  ): Promise<TranslationMapping[]> {
    const mappings: TranslationMapping[] = [];
    const sourceLocale = partner.languageCode;

    // Standard translatable fields
    const translatableFields = ['name', 'description', 'type', 'category', 'status'];

    // Target languages based on region
    const targetLocales = this.getTargetLocalesForRegion(partner.region);

    for (const field of translatableFields) {
      for (const targetLocale of targetLocales) {
        if (targetLocale === sourceLocale) continue;

        mappings.push({
          sourceField: field,
          targetField: field,
          sourceLocale,
          targetLocale,
          transformFn: field === 'type' ? 'translateEnum' : 'translate',
        });
      }
    }

    return mappings;
  }

  /**
   * Get target locales for a region
   */
  private getTargetLocalesForRegion(region: string): string[] {
    const regionLocales: Record<string, string[]> = {
      Baltic: ['et', 'lv', 'lt', 'en', 'ru'],
      Nordic: ['fi', 'sv', 'no', 'da', 'en'],
      EU: ['en', 'de', 'fr', 'es', 'it', 'pt', 'nl', 'pl'],
      NA: ['en', 'es', 'fr'],
      APAC: ['en', 'zh', 'ja', 'ko'],
    };

    return regionLocales[region] || ['en'];
  }

  /**
   * Generate documentation
   */
  private async generateDocumentation(partner: GlobalPartner): Promise<GeneratedDocs> {
    const typeName = this.sanitizeName(partner.name);

    const readme = `
# ${partner.name} Integration

Auto-generated integration for ${partner.name}.

## Overview

- **Region**: ${partner.region}
- **Country**: ${partner.country}
- **Language**: ${partner.languageCode}
- **Data Classification**: ${partner.dataClassification}
- **Compliance**: ${partner.complianceRequirements.join(', ')}

## Authentication

This integration supports the following authentication methods:
- ${partner.authMethod}

## Quick Start

\`\`\`typescript
import { ${typeName}Client } from '@intelgraph/integrations';

const client = new ${typeName}Client({
  apiKey: process.env.${typeName.toUpperCase()}_API_KEY,
});

// List entities
const entities = await client.list();

// Get entity by ID
const entity = await client.getById('entity-id');

// Search
const results = await client.search('query', { language: 'en' });
\`\`\`

## Available Operations

| Operation | GraphQL | REST | gRPC |
|-----------|---------|------|------|
| List | \`${this.camelCase(typeName)}s\` | GET /entities | ListEntities |
| Get | \`${this.camelCase(typeName)}\` | GET /entities/:id | GetEntity |
| Create | \`create${typeName}\` | POST /entities | CreateEntity |
| Update | \`update${typeName}\` | PATCH /entities/:id | UpdateEntity |
| Delete | \`delete${typeName}\` | DELETE /entities/:id | DeleteEntity |
| Sync | \`sync${typeName}\` | POST /sync | TriggerSync |

## Multi-Language Support

This integration supports automatic translation for the following languages:
${this.getTargetLocalesForRegion(partner.region).map((l) => `- ${l}`).join('\n')}

Set the \`Accept-Language\` header or \`language\` parameter to get translated responses.

## Rate Limits

| Tier | Per Minute | Per Hour |
|------|------------|----------|
| Free | 10 | 100 |
| Standard | 100 | 1,000 |
| Premium | 500 | 5,000 |
| Enterprise | 1,000 | 50,000 |

## Support

For issues with this integration, contact integrations@intelgraph.io
`;

    const apiReference = `# ${partner.name} API Reference\n\nFull API documentation available in OpenAPI format.`;
    const integrationGuide = `# ${partner.name} Integration Guide\n\nStep-by-step guide for integrating with ${partner.name}.`;
    const changelog = `# Changelog\n\n## ${this.config.defaultVersion} - ${new Date().toISOString().split('T')[0]}\n\n- Initial release`;

    return {
      readme,
      apiReference,
      integrationGuide,
      changelog,
    };
  }

  // Helper methods
  private sanitizeName(name: string): string {
    return name.replace(/[^a-zA-Z0-9]/g, '');
  }

  private camelCase(str: string): string {
    return str.charAt(0).toLowerCase() + str.slice(1);
  }
}
