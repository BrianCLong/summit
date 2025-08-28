/**
 * Persisted GraphQL Queries Plugin for IntelGraph
 * 
 * Security Features:
 * - Hash-based query whitelisting in production
 * - Automatic persisted query generation at build time
 * - Development mode bypass with configuration flag
 * - Query complexity analysis and limits
 * - Audit logging for blocked queries
 */

import crypto from 'crypto';
import { promises as fs } from 'fs';
import path from 'path';
import { writeAudit } from '../../utils/audit.js';

class PersistedQueriesPlugin {
  constructor(options = {}) {
    this.options = {
      enabled: process.env.NODE_ENV === 'production',
      allowNonPersisted: process.env.ALLOW_NON_PERSISTED_QUERIES === 'true',
      queriesFilePath: options.queriesFilePath || path.join(process.cwd(), 'persisted-queries.json'),
      maxQueryComplexity: options.maxQueryComplexity || 1000,
      generateOnBuild: options.generateOnBuild !== false,
      ...options
    };

    this.persistedQueries = new Map();
    this.loadPersistedQueries();
  }

  /**
   * Load persisted queries from file
   */
  async loadPersistedQueries() {
    try {
      const content = await fs.readFile(this.options.queriesFilePath, 'utf8');
      const queries = JSON.parse(content);
      
      for (const [hash, queryData] of Object.entries(queries)) {
        this.persistedQueries.set(hash, queryData);
      }
      
      console.log(`Loaded ${this.persistedQueries.size} persisted queries`);
    } catch (error) {
      if (error.code !== 'ENOENT') {
        console.warn('Failed to load persisted queries:', error.message);
      }
      
      // Generate initial file if it doesn't exist
      if (this.options.generateOnBuild) {
        await this.generateInitialQueries();
      }
    }
  }

  /**
   * Generate hash for a query string
   */
  generateQueryHash(query) {
    return crypto.createHash('sha256').update(query.trim()).digest('hex');
  }

  /**
   * Calculate query complexity (simple implementation)
   */
  calculateQueryComplexity(query) {
    // Simple complexity calculation based on query structure
    const fieldCount = (query.match(/\w+\s*\{/g) || []).length;
    const depthCount = (query.match(/\{/g) || []).length;
    const fragmentCount = (query.match(/\.\.\./g) || []).length;
    
    return fieldCount + (depthCount * 2) + (fragmentCount * 3);
  }

  /**
   * Validate and process GraphQL request
   */
  async processRequest(request, context) {
    const { query, variables = {}, operationName } = request;
    
    if (!query) {
      throw new Error('Query is required');
    }

    const queryHash = this.generateQueryHash(query);
    const complexity = this.calculateQueryComplexity(query);
    
    // Check complexity limits
    if (complexity > this.options.maxQueryComplexity) {
      await this.auditQueryBlock(context, 'COMPLEXITY_EXCEEDED', { 
        complexity, 
        limit: this.options.maxQueryComplexity,
        hash: queryHash 
      });
      throw new Error(`Query complexity ${complexity} exceeds limit ${this.options.maxQueryComplexity}`);
    }

    // In development or if non-persisted queries are allowed, permit all queries
    if (!this.options.enabled || this.options.allowNonPersisted) {
      // Still track for potential inclusion in persisted queries
      await this.trackQuery(query, queryHash, operationName, complexity);
      return { query, variables, operationName, hash: queryHash };
    }

    // Production mode - check if query is persisted
    const persistedQuery = this.persistedQueries.get(queryHash);
    
    if (!persistedQuery) {
      await this.auditQueryBlock(context, 'NON_PERSISTED_QUERY', { 
        hash: queryHash,
        operationName 
      });
      throw new Error(`Query not found in persisted queries. Hash: ${queryHash}`);
    }

    // Validate that the query matches the persisted version
    if (persistedQuery.query !== query.trim()) {
      await this.auditQueryBlock(context, 'QUERY_MISMATCH', { 
        hash: queryHash,
        operationName 
      });
      throw new Error(`Query content does not match persisted version`);
    }

    return { 
      query, 
      variables, 
      operationName, 
      hash: queryHash,
      persisted: true 
    };
  }

  /**
   * Track query usage for analytics and future persistence
   */
  async trackQuery(query, hash, operationName, complexity) {
    const existingQuery = this.persistedQueries.get(hash);
    
    if (existingQuery) {
      existingQuery.usageCount = (existingQuery.usageCount || 0) + 1;
      existingQuery.lastUsed = new Date().toISOString();
    } else if (this.options.generateOnBuild) {
      // Add to potential persisted queries
      this.persistedQueries.set(hash, {
        hash,
        query: query.trim(),
        operationName,
        complexity,
        usageCount: 1,
        firstSeen: new Date().toISOString(),
        lastUsed: new Date().toISOString(),
        source: 'runtime'
      });
    }
  }

  /**
   * Audit blocked queries for security monitoring
   */
  async auditQueryBlock(context, reason, details) {
    await writeAudit({
      userId: context.user?.id,
      action: 'GRAPHQL_QUERY_BLOCKED',
      resourceType: 'GraphQL',
      resourceId: null,
      details: { reason, ...details },
      ip: context.req?.ip,
      userAgent: context.req?.get('User-Agent'),
      severity: 'WARNING'
    });
  }

  /**
   * Save current persisted queries to file
   */
  async savePersistedQueries() {
    const queries = {};
    
    for (const [hash, queryData] of this.persistedQueries.entries()) {
      queries[hash] = queryData;
    }

    const content = JSON.stringify(queries, null, 2);
    await fs.writeFile(this.options.queriesFilePath, content, 'utf8');
    
    console.log(`Saved ${Object.keys(queries).length} persisted queries to ${this.options.queriesFilePath}`);
  }

  /**
   * Generate initial persisted queries from common operations
   */
  async generateInitialQueries() {
    const commonQueries = [
      {
        name: 'GetInvestigations',
        query: `
          query GetInvestigations($limit: Int, $offset: Int) {
            investigations(limit: $limit, offset: $offset) {
              id
              name
              description
              status
              createdAt
              updatedAt
              entityCount
              relationshipCount
            }
          }
        `
      },
      {
        name: 'ProvByIncident',
        query: `
          query ProvByIncident($id: ID!, $filter: ProvenanceFilter, $first: Int, $offset: Int) {
            provenanceByIncident(incidentId: $id, filter: $filter, first: $first, offset: $offset) {
              id
              kind
              createdAt
              metadata
            }
          }
        `
      },
      {
        name: 'ProvByInvestigation',
        query: `
          query ProvByInvestigation($id: ID!, $filter: ProvenanceFilter, $first: Int, $offset: Int) {
            provenanceByInvestigation(investigationId: $id, filter: $filter, first: $first, offset: $offset) {
              id
              kind
              createdAt
              metadata
            }
          }
        `
      },
      {
        name: 'ExportProv',
        query: `
          mutation ExportProv($incidentId: ID, $investigationId: ID, $filter: ProvenanceFilter, $format: String!) {
            exportProvenance(incidentId: $incidentId, investigationId: $investigationId, filter: $filter, format: $format) {
              url
              expiresAt
            }
          }
        `
      },
      {
        name: 'GetInvestigation',
        query: `
          query GetInvestigation($id: ID!) {
            investigation(id: $id) {
              id
              name
              description
              status
              createdAt
              updatedAt
              entities {
                id
                type
                name
                properties
              }
              relationships {
                id
                type
                fromEntityId
                toEntityId
                properties
              }
            }
          }
        `
      },
      {
        name: 'CreateInvestigation',
        query: `
          mutation CreateInvestigation($input: CreateInvestigationInput!) {
            createInvestigation(input: $input) {
              id
              name
              description
              status
              createdAt
            }
          }
        `
      },
      {
        name: 'StartCopilotRun',
        query: `
          mutation StartCopilotRun($goalText: String!, $investigationId: ID!) {
            startCopilotRun(goalText: $goalText, investigationId: $investigationId) {
              id
              goalText
              status
              createdAt
              plan {
                id
                steps {
                  id
                  taskType
                  status
                }
              }
            }
          }
        `
      },
      {
        name: 'GetCopilotRun',
        query: `
          query GetCopilotRun($id: ID!) {
            copilotRun(id: $id) {
              id
              goalText
              status
              createdAt
              startedAt
              finishedAt
              isActive
              tasks {
                id
                taskType
                status
                startedAt
                finishedAt
                errorMessage
              }
              events(limit: 50) {
                id
                level
                message
                createdAt
                payload
              }
            }
          }
        `
      },
      {
        name: 'CopilotEventsSubscription',
        query: `
          subscription CopilotEvents($runId: ID!) {
            copilotEvents(runId: $runId) {
              id
              level
              message
              createdAt
              payload
            }
          }
        `
      }
    ];

    for (const { name, query } of commonQueries) {
      const hash = this.generateQueryHash(query);
      const complexity = this.calculateQueryComplexity(query);
      
      this.persistedQueries.set(hash, {
        hash,
        query: query.trim(),
        operationName: name,
        complexity,
        usageCount: 0,
        firstSeen: new Date().toISOString(),
        source: 'initial'
      });
    }

    await this.savePersistedQueries();
  }

  /**
   * Get statistics about persisted queries
   */
  getStats() {
    const queries = Array.from(this.persistedQueries.values());
    
    return {
      total: queries.length,
      bySource: queries.reduce((acc, q) => {
        acc[q.source] = (acc[q.source] || 0) + 1;
        return acc;
      }, {}),
      averageComplexity: queries.reduce((sum, q) => sum + q.complexity, 0) / queries.length,
      mostUsed: queries
        .sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0))
        .slice(0, 10)
        .map(q => ({ operationName: q.operationName, usageCount: q.usageCount }))
    };
  }

  /**
   * Apollo Server plugin interface
   */
  apolloServerPlugin() {
    const self = this; // Capture 'this'
    return {
      async requestDidStart(requestContext) {
        return {
          async didResolveOperation(requestContext) {
            try {
              await self.processRequest(requestContext.request, requestContext.context);
            } catch (error) {
              throw error;
            }
          }
        };
      }
    };
  }
}

export default PersistedQueriesPlugin;
