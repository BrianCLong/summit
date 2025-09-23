/**
 * IntelGraph GraphQL Resolvers
 * 
 * MIT License
 * Copyright (c) 2025 IntelGraph
 */

import { GraphQLDateTime, GraphQLJSON } from 'graphql-scalars';
import { entityResolvers } from './entity.js';
import { relationshipResolvers } from './relationship.js';
import { investigationResolvers } from './investigation.js';
import { analyticsResolvers } from './analytics.js';
import { copilotResolvers } from './copilot.js';
import { userResolvers } from './user.js';

export const resolvers = {
  // Scalar types
  DateTime: GraphQLDateTime,
  JSON: GraphQLJSON,

  // Core queries
  Query: {
    ...entityResolvers.Query,
    ...relationshipResolvers.Query,
    ...investigationResolvers.Query,
    ...analyticsResolvers.Query,
    ...copilotResolvers.Query,
    ...userResolvers.Query,
    
    // Global search across all types
    globalSearch: async (_, { query, types }, context) => {
      const results = {
        entities: [],
        relationships: [],
        investigations: [],
        documents: []
      };

      try {
        // Parallel search across different types
        const searchPromises = [];

        if (!types || types.includes('entities')) {
          searchPromises.push(
            entityResolvers.Query.searchEntities(_, { query }, context)
              .then(entities => { results.entities = entities; })
          );
        }

        if (!types || types.includes('investigations')) {
          searchPromises.push(
            investigationResolvers.Query.investigations(_, { query }, context)
              .then(investigations => { results.investigations = investigations; })
          );
        }

        await Promise.all(searchPromises);

        context.logger.info({
          message: 'Global search completed',
          query,
          types,
          resultsCount: {
            entities: results.entities.length,
            relationships: results.relationships.length,
            investigations: results.investigations.length,
            documents: results.documents.length
          }
        });

        return results;

      } catch (error) {
        context.logger.error({
          message: 'Global search failed',
          error: error instanceof Error ? error.message : String(error),
          query,
          types
        });
        throw error;
      }
    }
  },

  // Core mutations
  Mutation: {
    ...entityResolvers.Mutation,
    ...relationshipResolvers.Mutation,
    ...investigationResolvers.Mutation,
    ...userResolvers.Mutation,

    // --- Sprint 14: Export Bundle (MVP) ---
    exportCase: async (_: unknown, { caseId }: { caseId: string }, context: any) => {
      if (process.env.FEATURE_PROV_LEDGER_MVP?.toLowerCase() !== 'true') {
        const err: any = new Error('Provenance Ledger export is disabled');
        err.code = 'FEATURE_DISABLED';
        throw err;
      }

      const baseUrl = process.env.PROV_LEDGER_URL; // e.g., http://localhost:8010
      const apiKey = process.env.PROV_LEDGER_API_KEY;

      // Structure of the response
      const out = { zipUrl: null as string | null, manifest: { root: null, entries: [] as any[] }, blockReason: null as string | null };

      if (!baseUrl) {
        // Scaffold-only: return empty manifest when service URL not configured
        context?.logger?.warn?.({ message: 'PROV_LEDGER_URL not set; returning stub manifest', caseId });
        return out;
      }

      try {
        // Build a bundle for the case; backend expects claim IDs. For MVP map caseId to claimId 1:1.
        const buildResp = await fetch(`${baseUrl.replace(/\/$/, '')}/bundles/build`, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            ...(apiKey ? { 'X-API-Key': apiKey } : {}),
          },
          body: JSON.stringify({ claim_ids: [caseId] }),
        });

        if (!buildResp.ok) {
          const detail = await buildResp.text();
          const blocked = process.env.FEATURE_EXPORT_POLICY_CHECK?.toLowerCase() === 'true';
          if (blocked) {
            return { ...out, blockReason: detail || 'Blocked by export policy' };
          }
          throw new Error(detail || 'Failed to build export bundle');
        }

        const bundle = await buildResp.json();
        out.manifest = bundle?.manifest ?? out.manifest;
        // zipUrl could be produced by a background job; omit for MVP
        return out;
      } catch (e: any) {
        context?.logger?.error?.({ message: 'exportCase failed', err: String(e), caseId });
        throw e;
      }
    },

    // --- Sprint 14: NL → Cypher Preview (sandbox only) ---
    previewNLQuery: async (
      _: unknown,
      { prompt, tenantId, manualCypher }: { prompt: string; tenantId: string; manualCypher?: string },
      context: any
    ) => {
      if (process.env.FEATURE_NL_QUERY_PREVIEW?.toLowerCase() !== 'true') {
        const err: any = new Error('NL Query Preview is disabled');
        err.code = 'FEATURE_DISABLED';
        throw err;
      }

      const ragUrl = (process.env.RAG_URL || process.env.NLQ_URL || '').replace(/\/$/, ''); // e.g., http://localhost:8020

      // Fallback deterministic template
      const fallback = (p: string) => {
        const safe = p.replace(/[^\w\s\-:\.]/g, ' ').slice(0, 160);
        const cypher = `MATCH (n:Entity { tenantId: $tenantId })\nWHERE toLower(n.name) CONTAINS toLower($q)\nRETURN n LIMIT 50`;
        return { cypher, estimatedRows: null, estimatedCost: null, warnings: [
          'Using conservative fallback template; RAG service not configured.'
        ], diffVsManual: null };
      };

      if (!ragUrl) {
        return fallback(prompt);
      }

      try {
        const resp = await fetch(`${ragUrl}/cypher`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            natural_language: prompt,
            tenant_id: tenantId,
            authority: 'viewer',
            schema_context: null,
            sandbox: true,
            manual_cypher: manualCypher || null,
          }),
        });

        if (!resp.ok) {
          context?.logger?.warn?.({ message: 'RAG /cypher responded non-OK', status: resp.status });
          return fallback(prompt);
        }

        const data = await resp.json();
        return {
          cypher: data?.cypher_query ?? fallback(prompt).cypher,
          estimatedRows: data?.estimated_rows ?? null,
          estimatedCost: data?.estimated_cost ?? null,
          warnings: Array.isArray(data?.warnings) ? data.warnings : [],
          diffVsManual: data?.diff_vs_manual ?? null,
        };
      } catch (e: any) {
        context?.logger?.error?.({ message: 'previewNLQuery failed; using fallback', err: String(e) });
        return fallback(prompt);
      }
    },
  },

  // Subscriptions for real-time updates
  Subscription: {
    entityUpdated: {
      subscribe: async function* (_, { investigationId }, context) {
        const { redis } = context.dataSources;
        const channel = investigationId 
          ? `entity:updated:${investigationId}` 
          : 'entity:updated';
        
        // Subscribe to Redis channel for entity updates
        const subscriber = redis.duplicate();
        await subscriber.subscribe(channel);
        
        try {
          for await (const message of subscriber.scanStream()) {
            yield { entityUpdated: JSON.parse(message.message) };
          }
        } finally {
          await subscriber.unsubscribe(channel);
          await subscriber.quit();
        }
      }
    },

    relationshipUpdated: {
      subscribe: async function* (_, { investigationId }, context) {
        const { redis } = context.dataSources;
        const channel = investigationId 
          ? `relationship:updated:${investigationId}` 
          : 'relationship:updated';
        
        const subscriber = redis.duplicate();
        await subscriber.subscribe(channel);
        
        try {
          for await (const message of subscriber.scanStream()) {
            yield { relationshipUpdated: JSON.parse(message.message) };
          }
        } finally {
          await subscriber.unsubscribe(channel);
          await subscriber.quit();
        }
      }
    },

    investigationUpdated: {
      subscribe: async function* (_, { id }, context) {
        const { redis } = context.dataSources;
        const channel = `investigation:updated:${id}`;
        
        const subscriber = redis.duplicate();
        await subscriber.subscribe(channel);
        
        try {
          for await (const message of subscriber.scanStream()) {
            yield { investigationUpdated: JSON.parse(message.message) };
          }
        } finally {
          await subscriber.unsubscribe(channel);
          await subscriber.quit();
        }
      }
    },

    analysisCompleted: {
      subscribe: async function* (_, { jobId }, context) {
        const { redis } = context.dataSources;
        const channel = `analysis:completed:${jobId}`;
        
        const subscriber = redis.duplicate();
        await subscriber.subscribe(channel);
        
        try {
          for await (const message of subscriber.scanStream()) {
            yield { analysisCompleted: JSON.parse(message.message) };
          }
        } finally {
          await subscriber.unsubscribe(channel);
          await subscriber.quit();
        }
      }
    }
  },

  // Type resolvers for nested fields
  Entity: {
    ...entityResolvers.Entity
  },

  Relationship: {
    ...relationshipResolvers.Relationship
  },

  Investigation: {
    ...investigationResolvers.Investigation
  },

  User: {
    ...userResolvers.User
  }
};
