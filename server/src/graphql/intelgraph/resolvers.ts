import { GraphQLScalarType, GraphQLError } from 'graphql';
import { Pool } from 'pg';
import neo4j from 'neo4j-driver';
import { DateTimeResolver, JSONResolver } from 'graphql-scalars';

import type {
  Entity,
  Indicator,
  Source,
  PathStep,
  GraphInsight,
  EntitySearchResult,
  EntityGraph,
  HealthStatus,
  ResolverContext,
} from './types';

// No-op tracer shim
const tracer = {
  startSpan: (_name: string, _opts?: any) => ({
    setAttributes: (_a?: any) => {},
    setStatus: (_s?: any) => {},
    recordException: (_e?: any) => {},
    end: () => {},
  }),
};

export const resolvers = {
  DateTime: DateTimeResolver,
  JSON: JSONResolver,

  Query: {
    async entityById(
      _: unknown,
      { id }: { id: string },
      context: ResolverContext,
    ): Promise<Entity | null> {
      const span = tracer.startSpan('resolve-entity-by-id', {
        attributes: {
          'entity.id': id,
          'user.tenant': context.user?.tenant || 'unknown',
        },
      });

      try {
        // ABAC policy check via OPA
        const policyInput = {
          user: context.user,
          resource: {
            type: 'entity',
            id,
            tenant: context.user?.tenant,
          },
          operation_type: 'query',
        };

        const allowed = await context.opa.evaluate(
          'intelgraph.abac.allow',
          policyInput,
        );
        if (!allowed) {
          throw new GraphQLError('Access denied by policy', {
            extensions: { code: 'FORBIDDEN' },
          });
        }

        // Query Neo4j for entity
        const session = context.neo4j.session();
        try {
          const result = await session.run(
            `
            MATCH (e:Entity {id: $id})
            OPTIONAL MATCH (e)-[:FROM_SOURCE]->(s:Source)
            RETURN e, collect(s) as sources
          `,
            { id },
          );

          if (result.records.length === 0) {
            return null;
          }

          const record = result.records[0];
          const entity = record.get('e').properties;
          const sources = record.get('sources').map((s: any) => s.properties);

          // Apply PII redaction based on user scopes
          const redactedEntity = await this.applyPIIRedaction(entity, context);

          span.setAttributes?.({
            'entity.type': entity.type,
            'entity.sources_count': sources.length,
            'pii.redacted': redactedEntity !== entity,
          });

          return {
            ...redactedEntity,
            sources,
            degree: await this.getEntityDegree(id, context),
          };
        } finally {
          await session.close();
        }
      } catch (error) {
        span.recordException?.(error as Error);
        span.setStatus?.({ message: (error as Error).message });
        throw error;
      } finally {
        span.end?.();
      }
    },

    async searchEntities(
      _: unknown,
      {
        query,
        filter,
        pagination = { limit: 25, offset: 0 },
      }: {
        query: string;
        filter?: any;
        pagination?: { limit: number; offset: number };
      },
      context: ResolverContext,
    ): Promise<EntitySearchResult> {
      const span = tracer.startSpan('resolve-search-entities', {
        attributes: {
          'search.query': query,
          'search.limit': pagination.limit,
          'search.offset': pagination.offset,
        },
      });

      try {
        // Build Neo4j query with filters
        let cypherQuery = `
          MATCH (e:Entity)
          WHERE toLower(e.name) CONTAINS toLower($query)
             OR toLower(e.type) CONTAINS toLower($query)
        `;

        const params: any = { query };

        // Apply filters
        if (filter?.types) {
          cypherQuery += ' AND e.type IN $types';
          params.types = filter.types;
        }

        if (filter?.regions) {
          cypherQuery += ' AND e.region IN $regions';
          params.regions = filter.regions;
        }

        if (filter?.purposes) {
          cypherQuery += ' AND e.purpose IN $purposes';
          params.purposes = filter.purposes;
        }

        // Apply user tenant filter for ABAC
        if (context.user?.tenant) {
          cypherQuery += ' AND e.tenant = $tenant';
          params.tenant = context.user.tenant;
        }

        // Add pagination
        cypherQuery += `
          WITH e
          ORDER BY e.updated_at DESC
          SKIP $offset
          LIMIT $limit
          OPTIONAL MATCH (e)-[:FROM_SOURCE]->(s:Source)
          RETURN e, collect(s) as sources
        `;

        params.offset = pagination.offset;
        params.limit = pagination.limit;

        const session = context.neo4j.session();
        try {
          const [resultData, countResult] = await Promise.all([
            session.run(cypherQuery, params),
            session.run(
              cypherQuery
                .replace('SKIP $offset LIMIT $limit', '')
                .replace('ORDER BY e.updated_at DESC', '') +
                ' RETURN count(e) as total',
              params,
            ),
          ]);

          const entities = await Promise.all(
            resultData.records.map(async (record) => {
              const entity = record.get('e').properties;
              const sources = record
                .get('sources')
                .map((s: any) => s.properties);

              return {
                ...(await this.applyPIIRedaction(entity, context)),
                sources,
                degree: await this.getEntityDegree(entity.id, context),
              };
            }),
          );

          const totalCount =
            countResult.records[0]?.get('total')?.toNumber() || 0;

          span.setAttributes?.({
            'search.results_count': entities.length,
            'search.total_count': totalCount,
          });

          return {
            entities,
            totalCount,
            hasMore: pagination.offset + entities.length < totalCount,
            nextCursor:
              entities.length > 0
                ? Buffer.from(
                    (pagination.offset + pagination.limit).toString(),
                  ).toString('base64')
                : null,
          };
        } finally {
          await session.close();
        }
      } catch (error) {
        span.recordException(error as Error);
        span.setStatus({ code: 2, message: (error as Error).message });
        throw error;
      } finally {
        span.end();
      }
    },

    async pathBetween(
      _: unknown,
      {
        fromId,
        toId,
        maxHops = 3,
      }: {
        fromId: string;
        toId: string;
        maxHops: number;
      },
      context: ResolverContext,
    ): Promise<PathStep[]> {
      const span = tracer.startSpan('resolve-path-between', {
        attributes: {
          'path.from_id': fromId,
          'path.to_id': toId,
          'path.max_hops': maxHops,
        },
      });

      try {
        // Enforce SLO: max 3 hops for p95 < 1200ms
        if (maxHops > 3) {
          throw new GraphQLError('Maximum 3 hops allowed for path queries', {
            extensions: { code: 'BAD_REQUEST' },
          });
        }

        const session = context.neo4j.session();
        try {
          const result = await session.run(
            `
            MATCH path = shortestPath((from:Entity {id: $fromId})-[*1..${maxHops}]-(to:Entity {id: $toId}))
            WHERE from.tenant = $tenant AND to.tenant = $tenant
            WITH path, relationships(path) as rels, nodes(path) as nodes
            UNWIND range(0, length(rels)-1) as i
            RETURN
              nodes[i].id as fromId,
              nodes[i+1].id as toId,
              type(rels[i]) as relType,
              rels[i].weight as score,
              properties(rels[i]) as properties
            ORDER BY i
          `,
            {
              fromId,
              toId,
              tenant: context.user?.tenant || 'default',
            },
          );

          const pathSteps: PathStep[] = result.records.map((record) => ({
            from: record.get('fromId'),
            to: record.get('toId'),
            relType: record.get('relType'),
            score: record.get('score') || 1.0,
            properties: record.get('properties') || {},
          }));

          span.setAttributes?.({
            'path.steps_count': pathSteps.length,
            'path.found': pathSteps.length > 0,
          });

          return pathSteps;
        } finally {
          await session.close();
        }
      } catch (error) {
        span.recordException(error as Error);
        span.setStatus({ code: 2, message: (error as Error).message });
        throw error;
      } finally {
        span.end();
      }
    },

    async entityGraph(
      _: unknown,
      {
        centerEntityId,
        depth = 2,
        relationTypes,
      }: {
        centerEntityId: string;
        depth: number;
        relationTypes?: string[];
      },
      context: ResolverContext,
    ): Promise<EntityGraph> {
      const span = tracer.startSpan('resolve-entity-graph', {
        attributes: {
          'graph.center_entity_id': centerEntityId,
          'graph.depth': depth,
          'graph.relation_types': relationTypes?.join(',') || 'all',
        },
      });

      try {
        let relationFilter = '';
        if (relationTypes && relationTypes.length > 0) {
          relationFilter = `WHERE type(r) IN [${relationTypes.map((t) => `'${t}'`).join(',')}]`;
        }

        const session = context.neo4j.session();
        try {
          const result = await session.run(
            `
            MATCH path = (center:Entity {id: $centerEntityId})-[r*1..${depth}]-(connected:Entity)
            ${relationFilter}
            WHERE center.tenant = $tenant AND connected.tenant = $tenant
            WITH DISTINCT center, connected, relationships(path) as rels
            RETURN
              collect(DISTINCT {
                id: center.id,
                label: center.name,
                type: center.type,
                weight: center.degree
              }) + collect(DISTINCT {
                id: connected.id,
                label: connected.name,
                type: connected.type,
                weight: connected.degree
              }) as nodes,
              collect(DISTINCT {
                id: id(rels[0]),
                source: startNode(rels[0]).id,
                target: endNode(rels[0]).id,
                type: type(rels[0]),
                weight: coalesce(rels[0].weight, 1.0)
              }) as edges
          `,
            {
              centerEntityId,
              tenant: context.user?.tenant || 'default',
            },
          );

          if (result.records.length === 0) {
            return {
              nodes: [],
              edges: [],
              stats: {
                nodeCount: 0,
                edgeCount: 0,
                density: 0,
                clustering: 0,
              },
            };
          }

          const nodes = result.records[0].get('nodes');
          const edges = result.records[0].get('edges');

          // Calculate graph statistics
          const nodeCount = nodes.length;
          const edgeCount = edges.length;
          const density =
            nodeCount > 1 ? (2 * edgeCount) / (nodeCount * (nodeCount - 1)) : 0;

          span.setAttributes?.({
            'graph.nodes_count': nodeCount,
            'graph.edges_count': edgeCount,
            'graph.density': density,
          });

          return {
            nodes,
            edges,
            stats: {
              nodeCount,
              edgeCount,
              density,
              clustering: 0, // TODO: Calculate actual clustering coefficient
            },
          };
        } finally {
          await session.close();
        }
      } catch (error) {
        span.recordException(error as Error);
        span.setStatus({ code: 2, message: (error as Error).message });
        throw error;
      } finally {
        span.end();
      }
    },

    async health(
      _: unknown,
      __: unknown,
      context: ResolverContext,
    ): Promise<HealthStatus> {
      const startTime = Date.now();

      try {
        // Check database connections
        const [pgHealth, neo4jHealth] = await Promise.all([
          this.checkPostgreSQLHealth(context.pg),
          this.checkNeo4jHealth(context.neo4j),
        ]);

        const responseTime = Date.now() - startTime;

        return {
          status: pgHealth && neo4jHealth ? 'healthy' : 'unhealthy',
          timestamp: new Date(),
          version: '1.24.0',
          components: {
            postgresql: pgHealth ? 'healthy' : 'unhealthy',
            neo4j: neo4jHealth ? 'healthy' : 'unhealthy',
            opa: 'healthy', // TODO: Implement OPA health check
          },
          metrics: {
            response_time_ms: responseTime,
            uptime_seconds: process.uptime(),
            memory_usage_mb: Math.round(
              process.memoryUsage().heapUsed / 1024 / 1024,
            ),
          },
        };
      } catch (error) {
        return {
          status: 'unhealthy',
          timestamp: new Date(),
          version: '1.24.0',
          components: {
            error: (error as Error).message,
          },
          metrics: {},
        };
      }
    },
  },

  // Helper methods
  async applyPIIRedaction(entity: any, context: ResolverContext): Promise<any> {
    if (!entity.pii_flags || !context.user) {
      return entity;
    }

    const policyInput = {
      user: context.user,
      resource: {
        type: 'entity',
        id: entity.id,
        pii_flags: entity.pii_flags,
      },
    };

    const redactedFields = await context.opa.evaluate(
      'intelgraph.abac.pii_redact',
      policyInput,
    );

    if (redactedFields && redactedFields.length > 0) {
      const redacted = { ...entity };
      for (const field of redactedFields) {
        if (redacted.attributes && redacted.attributes[field]) {
          redacted.attributes[field] = '[REDACTED]';
        }
      }
      return redacted;
    }

    return entity;
  },

  async getEntityDegree(
    entityId: string,
    context: ResolverContext,
  ): Promise<number> {
    const session = context.neo4j.session();
    try {
      const result = await session.run(
        `
        MATCH (e:Entity {id: $entityId})-[r]-()
        RETURN count(r) as degree
      `,
        { entityId },
      );

      return result.records[0]?.get('degree')?.toNumber() || 0;
    } finally {
      await session.close();
    }
  },

  async checkPostgreSQLHealth(pg: Pool): Promise<boolean> {
    try {
      const client = await pg.connect();
      await client.query('SELECT 1');
      client.release();
      return true;
    } catch {
      return false;
    }
  },

  async checkNeo4jHealth(driver: neo4j.Driver): Promise<boolean> {
    try {
      const session = driver.session();
      await session.run('RETURN 1');
      await session.close();
      return true;
    } catch {
      return false;
    }
  },

  // New resolvers for Claim, Evidence, and Decision

  Mutation: {
    async createClaim(
      _: unknown,
      { input }: { input: any },
      context: ResolverContext,
    ): Promise<any> {
      const span = tracer.startSpan('create-claim');

      try {
        // ABAC policy check
        const policyInput = {
          user: context.user,
          resource: {
            type: 'claim',
            tenant: context.user?.tenant,
          },
          operation_type: 'create',
        };

        const allowed = await context.opa.evaluate(
          'intelgraph.abac.allow',
          policyInput,
        );
        if (!allowed) {
          throw new GraphQLError('Access denied by policy', {
            extensions: { code: 'FORBIDDEN' },
          });
        }

        // Use ClaimRepo if available, otherwise fallback to direct Neo4j
        if (context.claimRepo) {
          const claim = await context.claimRepo.upsertClaim(
            input.context?.caseId || 'default',
            input.statement,
            1.0,
            [],
          );
          return {
            ...claim,
            ...input,
            createdAt: new Date(claim.createdAt || Date.now()),
            updatedAt: new Date(claim.createdAt || Date.now()),
          };
        }

        // Fallback to direct Neo4j
        const session = context.neo4j.session();
        try {
          const result = await session.run(
            `CREATE (c:Claim {
              id: randomUUID(),
              claimType: $claimType,
              statement: $statement,
              subjects: $subjects,
              sources: $sources,
              verification: $verification,
              policyLabels: $policyLabels,
              relatedClaims: $relatedClaims,
              context: $context,
              properties: $properties,
              createdAt: timestamp(),
              updatedAt: timestamp(),
              tenant: $tenant
            })
            RETURN c`,
            {
              ...input,
              subjects: JSON.stringify(input.subjects),
              sources: JSON.stringify(input.sources),
              verification: JSON.stringify(input.verification || null),
              policyLabels: JSON.stringify(input.policyLabels || null),
              relatedClaims: JSON.stringify(input.relatedClaims || []),
              context: JSON.stringify(input.context || {}),
              properties: JSON.stringify(input.properties || {}),
              tenant: context.user?.tenant || 'default',
            },
          );

          const node = result.records[0]?.get('c').properties;
          return {
            ...node,
            subjects: JSON.parse(node.subjects),
            sources: JSON.parse(node.sources),
            verification: JSON.parse(node.verification || 'null'),
            policyLabels: JSON.parse(node.policyLabels || 'null'),
            relatedClaims: JSON.parse(node.relatedClaims || '[]'),
            context: JSON.parse(node.context || '{}'),
            properties: JSON.parse(node.properties || '{}'),
            createdAt: new Date(node.createdAt),
            updatedAt: new Date(node.updatedAt),
          };
        } finally {
          await session.close();
        }
      } catch (error) {
        span.recordException?.(error as Error);
        throw error;
      } finally {
        span.end?.();
      }
    },

    async createEvidence(
      _: unknown,
      { input }: { input: any },
      context: ResolverContext,
    ): Promise<any> {
      const span = tracer.startSpan('create-evidence');

      try {
        // ABAC policy check
        const policyInput = {
          user: context.user,
          resource: {
            type: 'evidence',
            tenant: context.user?.tenant,
          },
          operation_type: 'create',
        };

        const allowed = await context.opa.evaluate(
          'intelgraph.abac.allow',
          policyInput,
        );
        if (!allowed) {
          throw new GraphQLError('Access denied by policy', {
            extensions: { code: 'FORBIDDEN' },
          });
        }

        // Use EvidenceRepo if available
        if (context.evidenceRepo) {
          return await context.evidenceRepo.upsertEvidence(input);
        }

        // Fallback to direct Neo4j
        const session = context.neo4j.session();
        try {
          const result = await session.run(
            `CREATE (e:Evidence {
              id: randomUUID(),
              title: $title,
              description: $description,
              evidenceType: $evidenceType,
              sources: $sources,
              blobs: $blobs,
              policyLabels: $policyLabels,
              context: $context,
              verification: $verification,
              tags: $tags,
              properties: $properties,
              createdAt: timestamp(),
              updatedAt: timestamp(),
              tenant: $tenant
            })
            RETURN e`,
            {
              ...input,
              sources: JSON.stringify(input.sources),
              blobs: JSON.stringify(input.blobs),
              policyLabels: JSON.stringify(input.policyLabels),
              context: JSON.stringify(input.context || null),
              verification: JSON.stringify(input.verification || null),
              tags: JSON.stringify(input.tags || []),
              properties: JSON.stringify(input.properties || {}),
              tenant: context.user?.tenant || 'default',
            },
          );

          const node = result.records[0]?.get('e').properties;
          return {
            ...node,
            sources: JSON.parse(node.sources),
            blobs: JSON.parse(node.blobs),
            policyLabels: JSON.parse(node.policyLabels),
            context: JSON.parse(node.context || 'null'),
            verification: JSON.parse(node.verification || 'null'),
            tags: JSON.parse(node.tags || '[]'),
            properties: JSON.parse(node.properties || '{}'),
            createdAt: new Date(node.createdAt),
            updatedAt: new Date(node.updatedAt),
          };
        } finally {
          await session.close();
        }
      } catch (error) {
        span.recordException?.(error as Error);
        throw error;
      } finally {
        span.end?.();
      }
    },

    async createDecision(
      _: unknown,
      { input }: { input: any },
      context: ResolverContext,
    ): Promise<any> {
      const span = tracer.startSpan('create-decision');

      try {
        // ABAC policy check
        const policyInput = {
          user: context.user,
          resource: {
            type: 'decision',
            tenant: context.user?.tenant,
          },
          operation_type: 'create',
        };

        const allowed = await context.opa.evaluate(
          'intelgraph.abac.allow',
          policyInput,
        );
        if (!allowed) {
          throw new GraphQLError('Access denied by policy', {
            extensions: { code: 'FORBIDDEN' },
          });
        }

        // Use DecisionRepo if available
        if (context.decisionRepo) {
          const { evidenceIds, claimIds, ...decisionData } = input;
          const decision = await context.decisionRepo.upsertDecision(decisionData);

          // Link evidence and claims
          if (evidenceIds && evidenceIds.length > 0) {
            await context.decisionRepo.linkEvidence(decision.id, evidenceIds);
          }
          if (claimIds && claimIds.length > 0) {
            await context.decisionRepo.linkClaims(decision.id, claimIds);
          }

          // Load linked entities
          const [evidence, claims] = await Promise.all([
            evidenceIds && evidenceIds.length > 0
              ? context.decisionRepo.getLinkedEvidence(decision.id)
              : [],
            claimIds && claimIds.length > 0
              ? context.decisionRepo.getLinkedClaims(decision.id)
              : [],
          ]);

          return {
            ...decision,
            evidence,
            claims,
            createdAt: new Date(decision.createdAt || Date.now()),
            updatedAt: new Date(decision.updatedAt || Date.now()),
          };
        }

        // Fallback to direct Neo4j
        const session = context.neo4j.session();
        try {
          const result = await session.run(
            `CREATE (d:Decision {
              id: randomUUID(),
              title: $title,
              description: $description,
              context: $context,
              options: $options,
              selectedOption: $selectedOption,
              rationale: $rationale,
              reversible: $reversible,
              status: $status,
              decidedBy: $decidedBy,
              decidedAt: $decidedAt,
              approvedBy: $approvedBy,
              policyLabels: $policyLabels,
              risks: $risks,
              owners: $owners,
              checks: $checks,
              tags: $tags,
              properties: $properties,
              createdAt: timestamp(),
              updatedAt: timestamp(),
              tenant: $tenant
            })
            RETURN d`,
            {
              title: input.title,
              description: input.description,
              context: JSON.stringify(input.context),
              options: JSON.stringify(input.options || []),
              selectedOption: input.selectedOption,
              rationale: input.rationale,
              reversible: input.reversible,
              status: input.status,
              decidedBy: JSON.stringify(input.decidedBy || null),
              decidedAt: input.decidedAt ? input.decidedAt.getTime() : null,
              approvedBy: JSON.stringify(input.approvedBy || []),
              policyLabels: JSON.stringify(input.policyLabels),
              risks: JSON.stringify(input.risks || []),
              owners: JSON.stringify(input.owners || []),
              checks: JSON.stringify(input.checks || []),
              tags: JSON.stringify(input.tags || []),
              properties: JSON.stringify(input.properties || {}),
              tenant: context.user?.tenant || 'default',
            },
          );

          const node = result.records[0]?.get('d').properties;

          // Link evidence and claims if provided
          if (input.evidenceIds && input.evidenceIds.length > 0) {
            await session.run(
              `MATCH (d:Decision {id: $decisionId})
               UNWIND $evidenceIds as evidenceId
               MATCH (e:Evidence {id: evidenceId})
               MERGE (d)-[:SUPPORTED_BY]->(e)`,
              { decisionId: node.id, evidenceIds: input.evidenceIds },
            );
          }

          if (input.claimIds && input.claimIds.length > 0) {
            await session.run(
              `MATCH (d:Decision {id: $decisionId})
               UNWIND $claimIds as claimId
               MATCH (c:Claim {id: claimId})
               MERGE (d)-[:BASED_ON]->(c)`,
              { decisionId: node.id, claimIds: input.claimIds },
            );
          }

          return {
            ...node,
            context: JSON.parse(node.context),
            options: JSON.parse(node.options || '[]'),
            decidedBy: JSON.parse(node.decidedBy || 'null'),
            approvedBy: JSON.parse(node.approvedBy || '[]'),
            policyLabels: JSON.parse(node.policyLabels),
            risks: JSON.parse(node.risks || '[]'),
            owners: JSON.parse(node.owners || '[]'),
            checks: JSON.parse(node.checks || '[]'),
            tags: JSON.parse(node.tags || '[]'),
            properties: JSON.parse(node.properties || '{}'),
            createdAt: new Date(node.createdAt),
            updatedAt: new Date(node.updatedAt),
            evidence: [],
            claims: [],
          };
        } finally {
          await session.close();
        }
      } catch (error) {
        span.recordException?.(error as Error);
        throw error;
      } finally {
        span.end?.();
      }
    },

    async updateClaim(
      _: unknown,
      { id, input }: { id: string; input: any },
      context: ResolverContext,
    ): Promise<any> {
      // Implementation similar to createClaim but with UPDATE
      const session = context.neo4j.session();
      try {
        const result = await session.run(
          `MATCH (c:Claim {id: $id})
           SET c.claimType = $claimType,
               c.statement = $statement,
               c.subjects = $subjects,
               c.sources = $sources,
               c.verification = $verification,
               c.policyLabels = $policyLabels,
               c.relatedClaims = $relatedClaims,
               c.context = $context,
               c.properties = $properties,
               c.updatedAt = timestamp()
           RETURN c`,
          {
            id,
            ...input,
            subjects: JSON.stringify(input.subjects),
            sources: JSON.stringify(input.sources),
            verification: JSON.stringify(input.verification || null),
            policyLabels: JSON.stringify(input.policyLabels || null),
            relatedClaims: JSON.stringify(input.relatedClaims || []),
            context: JSON.stringify(input.context || {}),
            properties: JSON.stringify(input.properties || {}),
          },
        );

        const node = result.records[0]?.get('c').properties;
        return {
          ...node,
          subjects: JSON.parse(node.subjects),
          sources: JSON.parse(node.sources),
          verification: JSON.parse(node.verification || 'null'),
          policyLabels: JSON.parse(node.policyLabels || 'null'),
          relatedClaims: JSON.parse(node.relatedClaims || '[]'),
          context: JSON.parse(node.context || '{}'),
          properties: JSON.parse(node.properties || '{}'),
          createdAt: new Date(node.createdAt),
          updatedAt: new Date(node.updatedAt),
        };
      } finally {
        await session.close();
      }
    },

    async updateEvidence(
      _: unknown,
      { id, input }: { id: string; input: any },
      context: ResolverContext,
    ): Promise<any> {
      // Implementation similar to createEvidence but with UPDATE
      const session = context.neo4j.session();
      try {
        const result = await session.run(
          `MATCH (e:Evidence {id: $id})
           SET e.title = $title,
               e.description = $description,
               e.evidenceType = $evidenceType,
               e.sources = $sources,
               e.blobs = $blobs,
               e.policyLabels = $policyLabels,
               e.context = $context,
               e.verification = $verification,
               e.tags = $tags,
               e.properties = $properties,
               e.updatedAt = timestamp()
           RETURN e`,
          {
            id,
            ...input,
            sources: JSON.stringify(input.sources),
            blobs: JSON.stringify(input.blobs),
            policyLabels: JSON.stringify(input.policyLabels),
            context: JSON.stringify(input.context || null),
            verification: JSON.stringify(input.verification || null),
            tags: JSON.stringify(input.tags || []),
            properties: JSON.stringify(input.properties || {}),
          },
        );

        const node = result.records[0]?.get('e').properties;
        return {
          ...node,
          sources: JSON.parse(node.sources),
          blobs: JSON.parse(node.blobs),
          policyLabels: JSON.parse(node.policyLabels),
          context: JSON.parse(node.context || 'null'),
          verification: JSON.parse(node.verification || 'null'),
          tags: JSON.parse(node.tags || '[]'),
          properties: JSON.parse(node.properties || '{}'),
          createdAt: new Date(node.createdAt),
          updatedAt: new Date(node.updatedAt),
        };
      } finally {
        await session.close();
      }
    },

    async updateDecision(
      _: unknown,
      { id, input }: { id: string; input: any },
      context: ResolverContext,
    ): Promise<any> {
      // Implementation similar to createDecision but with UPDATE
      if (context.decisionRepo) {
        return await context.decisionRepo.updateStatus(id, input.status);
      }

      const session = context.neo4j.session();
      try {
        const result = await session.run(
          `MATCH (d:Decision {id: $id})
           SET d.title = $title,
               d.description = $description,
               d.context = $context,
               d.options = $options,
               d.selectedOption = $selectedOption,
               d.rationale = $rationale,
               d.reversible = $reversible,
               d.status = $status,
               d.decidedBy = $decidedBy,
               d.decidedAt = $decidedAt,
               d.approvedBy = $approvedBy,
               d.policyLabels = $policyLabels,
               d.risks = $risks,
               d.owners = $owners,
               d.checks = $checks,
               d.tags = $tags,
               d.properties = $properties,
               d.updatedAt = timestamp()
           RETURN d`,
          {
            id,
            title: input.title,
            description: input.description,
            context: JSON.stringify(input.context),
            options: JSON.stringify(input.options || []),
            selectedOption: input.selectedOption,
            rationale: input.rationale,
            reversible: input.reversible,
            status: input.status,
            decidedBy: JSON.stringify(input.decidedBy || null),
            decidedAt: input.decidedAt ? input.decidedAt.getTime() : null,
            approvedBy: JSON.stringify(input.approvedBy || []),
            policyLabels: JSON.stringify(input.policyLabels),
            risks: JSON.stringify(input.risks || []),
            owners: JSON.stringify(input.owners || []),
            checks: JSON.stringify(input.checks || []),
            tags: JSON.stringify(input.tags || []),
            properties: JSON.stringify(input.properties || {}),
          },
        );

        const node = result.records[0]?.get('d').properties;
        return {
          ...node,
          context: JSON.parse(node.context),
          options: JSON.parse(node.options || '[]'),
          decidedBy: JSON.parse(node.decidedBy || 'null'),
          approvedBy: JSON.parse(node.approvedBy || '[]'),
          policyLabels: JSON.parse(node.policyLabels),
          risks: JSON.parse(node.risks || '[]'),
          owners: JSON.parse(node.owners || '[]'),
          checks: JSON.parse(node.checks || '[]'),
          tags: JSON.parse(node.tags || '[]'),
          properties: JSON.parse(node.properties || '{}'),
          createdAt: new Date(node.createdAt),
          updatedAt: new Date(node.updatedAt),
        };
      } finally {
        await session.close();
      }
    },
  },

  // Add Query resolvers for the new types
  claimById: async (
    _: unknown,
    { id }: { id: string },
    context: ResolverContext,
  ): Promise<any> => {
    if (context.claimRepo) {
      return await context.claimRepo.getClaimById(id);
    }

    const session = context.neo4j.session();
    try {
      const result = await session.run(
        `MATCH (c:Claim {id: $id}) WHERE c.tenant = $tenant RETURN c`,
        { id, tenant: context.user?.tenant || 'default' },
      );

      if (result.records.length === 0) {
        return null;
      }

      const node = result.records[0].get('c').properties;
      return {
        ...node,
        subjects: JSON.parse(node.subjects || '[]'),
        sources: JSON.parse(node.sources || '[]'),
        verification: JSON.parse(node.verification || 'null'),
        policyLabels: JSON.parse(node.policyLabels || 'null'),
        relatedClaims: JSON.parse(node.relatedClaims || '[]'),
        context: JSON.parse(node.context || '{}'),
        properties: JSON.parse(node.properties || '{}'),
        createdAt: new Date(node.createdAt),
        updatedAt: new Date(node.updatedAt),
      };
    } finally {
      await session.close();
    }
  },

  evidenceById: async (
    _: unknown,
    { id }: { id: string },
    context: ResolverContext,
  ): Promise<any> => {
    if (context.evidenceRepo) {
      return await context.evidenceRepo.getEvidenceById(id);
    }

    const session = context.neo4j.session();
    try {
      const result = await session.run(
        `MATCH (e:Evidence {id: $id}) WHERE e.tenant = $tenant RETURN e`,
        { id, tenant: context.user?.tenant || 'default' },
      );

      if (result.records.length === 0) {
        return null;
      }

      const node = result.records[0].get('e').properties;
      return {
        ...node,
        sources: JSON.parse(node.sources || '[]'),
        blobs: JSON.parse(node.blobs || '[]'),
        policyLabels: JSON.parse(node.policyLabels),
        context: JSON.parse(node.context || 'null'),
        verification: JSON.parse(node.verification || 'null'),
        tags: JSON.parse(node.tags || '[]'),
        properties: JSON.parse(node.properties || '{}'),
        createdAt: new Date(node.createdAt),
        updatedAt: new Date(node.updatedAt),
      };
    } finally {
      await session.close();
    }
  },

  decisionById: async (
    _: unknown,
    { id }: { id: string },
    context: ResolverContext,
  ): Promise<any> => {
    if (context.decisionRepo) {
      const decision = await context.decisionRepo.getDecisionById(id);
      if (!decision) return null;

      const [evidence, claims] = await Promise.all([
        context.decisionRepo.getLinkedEvidence(id),
        context.decisionRepo.getLinkedClaims(id),
      ]);

      return {
        ...decision,
        evidence,
        claims,
        createdAt: new Date(decision.createdAt || Date.now()),
        updatedAt: new Date(decision.updatedAt || Date.now()),
      };
    }

    const session = context.neo4j.session();
    try {
      const result = await session.run(
        `MATCH (d:Decision {id: $id}) WHERE d.tenant = $tenant
         OPTIONAL MATCH (d)-[:SUPPORTED_BY]->(e:Evidence)
         OPTIONAL MATCH (d)-[:BASED_ON]->(c:Claim)
         RETURN d, collect(DISTINCT e) as evidence, collect(DISTINCT c) as claims`,
        { id, tenant: context.user?.tenant || 'default' },
      );

      if (result.records.length === 0) {
        return null;
      }

      const node = result.records[0].get('d').properties;
      const evidence = result.records[0].get('evidence').map((e: any) => e.properties);
      const claims = result.records[0].get('claims').map((c: any) => c.properties);

      return {
        ...node,
        context: JSON.parse(node.context),
        options: JSON.parse(node.options || '[]'),
        decidedBy: JSON.parse(node.decidedBy || 'null'),
        approvedBy: JSON.parse(node.approvedBy || '[]'),
        policyLabels: JSON.parse(node.policyLabels),
        risks: JSON.parse(node.risks || '[]'),
        owners: JSON.parse(node.owners || '[]'),
        checks: JSON.parse(node.checks || '[]'),
        tags: JSON.parse(node.tags || '[]'),
        properties: JSON.parse(node.properties || '{}'),
        createdAt: new Date(node.createdAt),
        updatedAt: new Date(node.updatedAt),
        evidence,
        claims,
      };
    } finally {
      await session.close();
    }
  },

  searchClaims: async (
    _: unknown,
    { query, filter, pagination = { limit: 25, offset: 0 } }: any,
    context: ResolverContext,
  ): Promise<any[]> => {
    const session = context.neo4j.session();
    try {
      const result = await session.run(
        `MATCH (c:Claim)
         WHERE c.tenant = $tenant
         AND (toLower(c.statement) CONTAINS toLower($query) OR toLower(c.claimType) CONTAINS toLower($query))
         RETURN c
         ORDER BY c.createdAt DESC
         SKIP $offset
         LIMIT $limit`,
        {
          query,
          tenant: context.user?.tenant || 'default',
          offset: pagination.offset,
          limit: pagination.limit,
        },
      );

      return result.records.map((r) => {
        const node = r.get('c').properties;
        return {
          ...node,
          subjects: JSON.parse(node.subjects || '[]'),
          sources: JSON.parse(node.sources || '[]'),
          verification: JSON.parse(node.verification || 'null'),
          policyLabels: JSON.parse(node.policyLabels || 'null'),
          relatedClaims: JSON.parse(node.relatedClaims || '[]'),
          context: JSON.parse(node.context || '{}'),
          properties: JSON.parse(node.properties || '{}'),
          createdAt: new Date(node.createdAt),
          updatedAt: new Date(node.updatedAt),
        };
      });
    } finally {
      await session.close();
    }
  },

  searchEvidence: async (
    _: unknown,
    { query, filter, pagination = { limit: 25, offset: 0 } }: any,
    context: ResolverContext,
  ): Promise<any[]> => {
    const session = context.neo4j.session();
    try {
      const result = await session.run(
        `MATCH (e:Evidence)
         WHERE e.tenant = $tenant
         AND (toLower(e.title) CONTAINS toLower($query) OR toLower(e.description) CONTAINS toLower($query))
         RETURN e
         ORDER BY e.createdAt DESC
         SKIP $offset
         LIMIT $limit`,
        {
          query,
          tenant: context.user?.tenant || 'default',
          offset: pagination.offset,
          limit: pagination.limit,
        },
      );

      return result.records.map((r) => {
        const node = r.get('e').properties;
        return {
          ...node,
          sources: JSON.parse(node.sources || '[]'),
          blobs: JSON.parse(node.blobs || '[]'),
          policyLabels: JSON.parse(node.policyLabels),
          context: JSON.parse(node.context || 'null'),
          verification: JSON.parse(node.verification || 'null'),
          tags: JSON.parse(node.tags || '[]'),
          properties: JSON.parse(node.properties || '{}'),
          createdAt: new Date(node.createdAt),
          updatedAt: new Date(node.updatedAt),
        };
      });
    } finally {
      await session.close();
    }
  },

  searchDecisions: async (
    _: unknown,
    { query, filter, pagination = { limit: 25, offset: 0 } }: any,
    context: ResolverContext,
  ): Promise<any[]> => {
    if (context.decisionRepo) {
      return await context.decisionRepo.searchDecisions(query, filter, pagination.limit, pagination.offset);
    }

    const session = context.neo4j.session();
    try {
      const result = await session.run(
        `MATCH (d:Decision)
         WHERE d.tenant = $tenant
         AND (toLower(d.title) CONTAINS toLower($query) OR toLower(d.description) CONTAINS toLower($query))
         RETURN d
         ORDER BY d.createdAt DESC
         SKIP $offset
         LIMIT $limit`,
        {
          query,
          tenant: context.user?.tenant || 'default',
          offset: pagination.offset,
          limit: pagination.limit,
        },
      );

      return result.records.map((r) => {
        const node = r.get('d').properties;
        return {
          ...node,
          context: JSON.parse(node.context),
          options: JSON.parse(node.options || '[]'),
          decidedBy: JSON.parse(node.decidedBy || 'null'),
          approvedBy: JSON.parse(node.approvedBy || '[]'),
          policyLabels: JSON.parse(node.policyLabels),
          risks: JSON.parse(node.risks || '[]'),
          owners: JSON.parse(node.owners || '[]'),
          checks: JSON.parse(node.checks || '[]'),
          tags: JSON.parse(node.tags || '[]'),
          properties: JSON.parse(node.properties || '{}'),
          createdAt: new Date(node.createdAt),
          updatedAt: new Date(node.updatedAt),
        };
      });
    } finally {
      await session.close();
    }
  },
};
