"use strict";
/**
 * API Documentation Generator
 * Generates version-specific API documentation
 *
 * MIT License
 * Copyright (c) 2025 IntelGraph
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.documentationGenerator = void 0;
const version_registry_js_1 = require("./version-registry.js");
const logger_js_1 = require("../utils/logger.js");
class DocumentationGenerator {
    /**
     * Generate complete API documentation for a version
     */
    generateDocumentation(version) {
        const versionInfo = version_registry_js_1.versionRegistry.getVersion(version);
        if (!versionInfo) {
            logger_js_1.logger.warn({ message: 'Version not found for documentation', version });
            return null;
        }
        return {
            version,
            title: `IntelGraph API ${version}`,
            description: versionInfo.description,
            baseUrl: process.env.API_BASE_URL || 'https://api.intelgraph.io',
            status: versionInfo.status,
            releaseDate: versionInfo.releaseDate.toISOString(),
            deprecationDate: versionInfo.deprecationDate?.toISOString(),
            sunsetDate: versionInfo.sunsetDate?.toISOString(),
            changelog: versionInfo.changelog,
            endpoints: this.generateEndpointDocs(version),
            authentication: this.generateAuthDocs(),
            examples: this.generateExamples(version),
            migrationGuides: this.generateMigrationGuides(version),
        };
    }
    /**
     * Generate endpoint documentation
     */
    generateEndpointDocs(version) {
        const docs = [];
        // GraphQL endpoint
        docs.push({
            path: `/${version}/graphql`,
            method: 'POST',
            description: 'GraphQL API endpoint for queries, mutations, and subscriptions',
            parameters: [
                {
                    name: 'api-version',
                    in: 'header',
                    description: 'API version (optional if using URL versioning)',
                    required: false,
                    type: 'string',
                    example: version,
                },
                {
                    name: 'Authorization',
                    in: 'header',
                    description: 'Bearer token for authentication',
                    required: true,
                    type: 'string',
                    example: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
                },
            ],
            requestBody: {
                description: 'GraphQL query or mutation',
                contentType: 'application/json',
                schema: {
                    type: 'object',
                    properties: {
                        query: { type: 'string' },
                        variables: { type: 'object' },
                        operationName: { type: 'string' },
                    },
                    required: ['query'],
                },
                examples: [
                    {
                        name: 'Query entities',
                        description: 'Fetch entities with filters',
                        request: {
                            query: `
                query GetEntities($filter: EntityFilter!) {
                  entities(filter: $filter) {
                    id
                    name
                    type
                    confidence
                  }
                }
              `,
                            variables: {
                                filter: {
                                    types: ['PERSON', 'ORGANIZATION'],
                                },
                            },
                        },
                        response: null,
                    },
                ],
            },
            responses: [
                {
                    statusCode: 200,
                    description: 'Successful GraphQL response',
                    schema: {
                        type: 'object',
                        properties: {
                            data: { type: 'object' },
                            errors: { type: 'array' },
                        },
                    },
                    examples: [],
                },
                {
                    statusCode: 400,
                    description: 'Bad request - invalid GraphQL query',
                    examples: [],
                },
                {
                    statusCode: 401,
                    description: 'Unauthorized - invalid or missing token',
                    examples: [],
                },
            ],
            examples: [],
        });
        // REST API endpoints (if applicable for this version)
        docs.push({
            path: `/${version}/api/entities`,
            method: 'GET',
            description: 'List entities with optional filtering',
            parameters: [
                {
                    name: 'type',
                    in: 'query',
                    description: 'Filter by entity type',
                    required: false,
                    type: 'string',
                    example: 'PERSON',
                },
                {
                    name: 'limit',
                    in: 'query',
                    description: 'Number of results to return',
                    required: false,
                    type: 'number',
                    example: 50,
                },
            ],
            responses: [
                {
                    statusCode: 200,
                    description: 'List of entities',
                    examples: [],
                },
            ],
            examples: [],
        });
        return docs;
    }
    /**
     * Generate authentication documentation
     */
    generateAuthDocs() {
        return {
            type: 'bearer',
            description: 'API uses JWT bearer token authentication. Include the token in the Authorization header.',
            headerName: 'Authorization',
            example: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
        };
    }
    /**
     * Generate usage examples
     */
    generateExamples(version) {
        const examples = [];
        examples.push({
            name: 'Create an entity',
            description: 'Create a new entity using GraphQL mutation',
            request: {
                query: `
          mutation CreateEntity($input: CreateEntityInput!) {
            createEntity(input: $input) {
              id
              name
              type
              confidence
              createdAt
            }
          }
        `,
                variables: {
                    input: {
                        type: 'PERSON',
                        name: 'John Doe',
                        description: 'Subject of investigation',
                        confidence: version === 'v1' ? 0.95 : 95,
                        sourceIds: ['src-123'],
                    },
                },
            },
            response: {
                data: {
                    createEntity: {
                        id: 'ent-456',
                        name: 'John Doe',
                        type: 'PERSON',
                        confidence: version === 'v1' ? 0.95 : 95,
                        createdAt: '2025-01-15T10:30:00Z',
                    },
                },
            },
        });
        examples.push({
            name: 'Search entities',
            description: 'Search for entities by keyword',
            request: {
                query: `
          query SearchEntities($query: String!) {
            searchEntities(query: $query) {
              id
              name
              type
              confidence
            }
          }
        `,
                variables: {
                    query: 'John Doe',
                },
            },
            response: {
                data: {
                    searchEntities: [
                        {
                            id: 'ent-456',
                            name: 'John Doe',
                            type: 'PERSON',
                            confidence: version === 'v1' ? 0.95 : 95,
                        },
                    ],
                },
            },
        });
        return examples;
    }
    /**
     * Generate migration guides for a version
     */
    generateMigrationGuides(version) {
        const guides = [];
        const compatMappings = version_registry_js_1.versionRegistry.getCompatibilityMappings(version);
        for (const compat of compatMappings) {
            if (compat.compatible && compat.to !== version) {
                guides.push(this.generateMigrationGuide(version, compat.to));
            }
        }
        return guides;
    }
    /**
     * Generate a single migration guide
     */
    generateMigrationGuide(fromVersion, toVersion) {
        const fromInfo = version_registry_js_1.versionRegistry.getVersion(fromVersion);
        const toInfo = version_registry_js_1.versionRegistry.getVersion(toVersion);
        const breakingChanges = toInfo?.changelog
            .filter((c) => c.type === 'breaking')
            .map((c) => ({
            type: c.type,
            description: c.description,
            impact: 'high',
            workaround: c.migration,
        })) || [];
        return {
            fromVersion,
            toVersion,
            title: `Migrating from ${fromVersion} to ${toVersion}`,
            overview: `This guide helps you migrate your application from API ${fromVersion} to ${toVersion}.`,
            breakingChanges,
            steps: this.generateMigrationSteps(fromVersion, toVersion),
            codeExamples: this.generateMigrationExamples(fromVersion, toVersion),
        };
    }
    /**
     * Generate migration steps
     */
    generateMigrationSteps(fromVersion, toVersion) {
        const steps = [];
        // Example steps for v1 to v2 migration
        if (fromVersion === 'v1' && toVersion === 'v2') {
            steps.push({
                order: 1,
                title: 'Update API endpoint URLs',
                description: 'Change all API calls from /v1/* to /v2/*',
            });
            steps.push({
                order: 2,
                title: 'Update confidence values',
                description: 'Convert confidence values from decimal (0-1) to percentage (0-100)',
                code: `
// Before (v1)
const entity = {
  confidence: 0.95
};

// After (v2)
const entity = {
  confidence: 95
};
        `,
            });
            steps.push({
                order: 3,
                title: 'Replace deprecated methods',
                description: 'Replace globalSearch with searchEntities',
                code: `
// Before (v1)
query {
  globalSearch(query: "John Doe", types: ["PERSON"]) {
    ...
  }
}

// After (v2)
query {
  searchEntities(query: "John Doe", filter: { types: [PERSON] }) {
    ...
  }
}
        `,
            });
            steps.push({
                order: 4,
                title: 'Test your integration',
                description: 'Thoroughly test all API calls with the new version',
            });
        }
        return steps;
    }
    /**
     * Generate code migration examples
     */
    generateMigrationExamples(fromVersion, toVersion) {
        const examples = [];
        if (fromVersion === 'v1' && toVersion === 'v2') {
            examples.push({
                title: 'Creating an entity with confidence',
                language: 'graphql',
                before: `
mutation {
  createEntity(input: {
    type: PERSON
    name: "John Doe"
    confidence: 0.95  # Decimal format
    sourceIds: ["src-123"]
  }) {
    id
    confidence
  }
}
        `,
                after: `
mutation {
  createEntity(input: {
    type: PERSON
    name: "John Doe"
    confidence: 95  # Percentage format
    sourceIds: ["src-123"]
  }) {
    id
    confidence
  }
}
        `,
            });
            examples.push({
                title: 'Searching entities',
                language: 'graphql',
                before: `
query {
  globalSearch(query: "investigation", types: ["PERSON", "ORG"]) {
    id
    name
  }
}
        `,
                after: `
query {
  searchEntities(
    query: "investigation"
    filter: { types: [PERSON, ORGANIZATION] }
  ) {
    id
    name
  }
}
        `,
            });
        }
        return examples;
    }
    /**
     * Generate markdown documentation
     */
    generateMarkdown(version) {
        const doc = this.generateDocumentation(version);
        if (!doc)
            return '';
        let markdown = `# IntelGraph API ${version} Documentation\n\n`;
        markdown += `**Status:** ${doc.status}\n`;
        markdown += `**Released:** ${new Date(doc.releaseDate).toLocaleDateString()}\n`;
        if (doc.deprecationDate) {
            markdown += `**Deprecated:** ${new Date(doc.deprecationDate).toLocaleDateString()}\n`;
        }
        if (doc.sunsetDate) {
            markdown += `**Sunset:** ${new Date(doc.sunsetDate).toLocaleDateString()}\n`;
        }
        markdown += `\n${doc.description}\n\n`;
        markdown += `## Base URL\n\n\`\`\`\n${doc.baseUrl}/${version}\n\`\`\`\n\n`;
        markdown += `## Authentication\n\n`;
        markdown += `${doc.authentication.description}\n\n`;
        markdown += `\`\`\`\n${doc.authentication.example}\n\`\`\`\n\n`;
        markdown += `## Endpoints\n\n`;
        for (const endpoint of doc.endpoints) {
            markdown += `### ${endpoint.method} ${endpoint.path}\n\n`;
            markdown += `${endpoint.description}\n\n`;
            if (endpoint.deprecated) {
                markdown += `> **⚠️ DEPRECATED:** ${endpoint.deprecationNotice}\n\n`;
            }
            if (endpoint.parameters.length > 0) {
                markdown += `**Parameters:**\n\n`;
                for (const param of endpoint.parameters) {
                    markdown += `- \`${param.name}\` (${param.type}, ${param.required ? 'required' : 'optional'}): ${param.description}\n`;
                }
                markdown += `\n`;
            }
        }
        markdown += `## Examples\n\n`;
        for (const example of doc.examples) {
            markdown += `### ${example.name}\n\n`;
            markdown += `${example.description}\n\n`;
            if (example.request) {
                markdown += `**Request:**\n\`\`\`json\n${JSON.stringify(example.request, null, 2)}\n\`\`\`\n\n`;
            }
            if (example.response) {
                markdown += `**Response:**\n\`\`\`json\n${JSON.stringify(example.response, null, 2)}\n\`\`\`\n\n`;
            }
        }
        markdown += `## Changelog\n\n`;
        for (const change of doc.changelog) {
            const icon = {
                feature: '✨',
                fix: '🐛',
                breaking: '⚠️',
                deprecation: '📢',
                security: '🔒',
            }[change.type] || '•';
            markdown += `- ${icon} **${change.type}**: ${change.description}\n`;
        }
        return markdown;
    }
    /**
     * Generate OpenAPI/Swagger specification
     */
    generateOpenAPI(version) {
        const doc = this.generateDocumentation(version);
        if (!doc)
            return null;
        return {
            openapi: '3.0.0',
            info: {
                title: doc.title,
                version: version.replace('v', ''),
                description: doc.description,
            },
            servers: [
                {
                    url: `${doc.baseUrl}/${version}`,
                    description: `${doc.status} server`,
                },
            ],
            paths: this.convertEndpointsToOpenAPI(doc.endpoints),
            components: {
                securitySchemes: {
                    bearerAuth: {
                        type: 'http',
                        scheme: 'bearer',
                        bearerFormat: 'JWT',
                    },
                },
            },
            security: [{ bearerAuth: [] }],
        };
    }
    /**
     * Convert endpoint docs to OpenAPI paths
     */
    convertEndpointsToOpenAPI(endpoints) {
        const paths = {};
        for (const endpoint of endpoints) {
            if (!paths[endpoint.path]) {
                paths[endpoint.path] = {};
            }
            paths[endpoint.path][endpoint.method.toLowerCase()] = {
                summary: endpoint.description,
                deprecated: endpoint.deprecated,
                parameters: endpoint.parameters.map((p) => ({
                    name: p.name,
                    in: p.in,
                    description: p.description,
                    required: p.required,
                    schema: { type: p.type },
                })),
                responses: endpoint.responses.reduce((acc, r) => {
                    acc[r.statusCode] = {
                        description: r.description,
                        content: r.schema ? {
                            'application/json': {
                                schema: r.schema,
                            },
                        } : undefined,
                    };
                    return acc;
                }, {}),
            };
        }
        return paths;
    }
}
// Singleton instance
exports.documentationGenerator = new DocumentationGenerator();
