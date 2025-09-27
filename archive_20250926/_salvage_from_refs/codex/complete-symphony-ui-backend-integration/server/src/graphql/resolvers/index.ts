// Production Core Resolvers (replaces demo resolvers)
import { coreResolvers } from './core.js';

// Legacy resolvers (kept for backward compatibility during migration)
import entityResolvers from './entity';
import relationshipResolvers from './relationship';
import userResolvers from './user';
import investigationResolvers from './investigation';
import { WargameResolver } from '../../resolvers/WargameResolver.js'; // WAR-GAMED SIMULATION - FOR DECISION SUPPORT ONLY
import briefResolvers from './brief';

// Instantiate the WargameResolver
const wargameResolver = new WargameResolver(); // WAR-GAMED SIMULATION - FOR DECISION SUPPORT ONLY

const resolvers = {
  // Core scalars from production resolvers
  DateTime: coreResolvers.DateTime,
  JSON: coreResolvers.JSON,

  Query: {
    // Production core resolvers (PostgreSQL + Neo4j)
    ...coreResolvers.Query,

    // Legacy resolvers (will be phased out)
    ...entityResolvers.Query,
    ...userResolvers.Query,
    ...investigationResolvers.Query,
    ...briefResolvers.Query,

    // WAR-GAMED SIMULATION - FOR DECISION SUPPORT ONLY
    getCrisisTelemetry: wargameResolver.getCrisisTelemetry.bind(wargameResolver),
    getAdversaryIntentEstimates: wargameResolver.getAdversaryIntentEstimates.bind(wargameResolver),
    getNarrativeHeatmapData: wargameResolver.getNarrativeHeatmapData.bind(wargameResolver),
    getStrategicResponsePlaybooks:
      wargameResolver.getStrategicResponsePlaybooks.bind(wargameResolver),
    getCrisisScenario: wargameResolver.getCrisisScenario.bind(wargameResolver),
    getAllCrisisScenarios: wargameResolver.getAllCrisisScenarios.bind(wargameResolver),
  },

  Mutation: {
    // Production core resolvers
    ...coreResolvers.Mutation,

    // Legacy resolvers (will be phased out)
    ...entityResolvers.Mutation,
    ...relationshipResolvers.Mutation,
    ...userResolvers.Mutation,
    ...investigationResolvers.Mutation,
    ...briefResolvers.Mutation,

    // WAR-GAMED SIMULATION - FOR DECISION SUPPORT ONLY
    runWarGameSimulation: wargameResolver.runWarGameSimulation.bind(wargameResolver),
    updateCrisisScenario: wargameResolver.updateCrisisScenario.bind(wargameResolver),
    deleteCrisisScenario: wargameResolver.deleteCrisisScenario.bind(wargameResolver),

    // Sprint 14 — NL → Cypher Preview (sandbox only)
    async previewNLQuery(
      _parent: unknown,
      args: { prompt: string; tenantId: string; manualCypher?: string | null },
      _context: any
    ) {
      if ((process.env.FEATURE_NL_QUERY_PREVIEW || '').toLowerCase() !== 'true') {
        throw Object.assign(new Error('NL Query Preview is disabled'), { code: 'FEATURE_DISABLED' });
      }
      const ragUrl = (process.env.RAG_URL || process.env.NLQ_URL || '').replace(/\/$/, '');
      const fallback = () => ({
        cypher: `MATCH (n:Entity { tenantId: $tenantId })\nWHERE toLower(n.name) CONTAINS toLower($q)\nRETURN n LIMIT 50`,
        estimatedRows: null,
        estimatedCost: null,
        warnings: ['Using fallback template; RAG service not configured.'],
        diffVsManual: null,
      });
      if (!ragUrl) return fallback();
      try {
        const resp = await fetch(`${ragUrl}/cypher`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            natural_language: args.prompt,
            tenant_id: args.tenantId,
            authority: 'viewer',
            schema_context: null,
            sandbox: true,
            manual_cypher: args.manualCypher || null,
          }),
        });
        if (!resp.ok) return fallback();
        const data = await resp.json();
        return {
          cypher: data?.cypher_query ?? fallback().cypher,
          estimatedRows: data?.estimated_rows ?? null,
          estimatedCost: data?.estimated_cost ?? null,
          warnings: Array.isArray(data?.warnings) ? data.warnings : [],
          diffVsManual: data?.diff_vs_manual ?? null,
        };
      } catch {
        return fallback();
      }
    },

    // Sprint 14 — Provenance Export (MVP)
    async exportCase(_parent: unknown, args: { caseId: string }, _context: any) {
      if ((process.env.FEATURE_PROV_LEDGER_MVP || '').toLowerCase() !== 'true') {
        throw Object.assign(new Error('Provenance Ledger export is disabled'), { code: 'FEATURE_DISABLED' });
      }
      const baseUrl = (process.env.PROV_LEDGER_URL || '').replace(/\/$/, '');
      const apiKey = process.env.PROV_LEDGER_API_KEY;
      const out = { zipUrl: null as string | null, manifest: { root: null, entries: [] as any[] }, blockReason: null as string | null };
      if (!baseUrl) return out;
      try {
        const resp = await fetch(`${baseUrl}/bundles/build`, {
          method: 'POST',
          headers: { 'content-type': 'application/json', ...(apiKey ? { 'X-API-Key': apiKey } : {}) },
          body: JSON.stringify({ claim_ids: [args.caseId] }),
        });
        if (!resp.ok) {
          const detail = await resp.text();
          if ((process.env.FEATURE_EXPORT_POLICY_CHECK || '').toLowerCase() === 'true') {
            return { ...out, blockReason: detail || 'Blocked by export policy' };
          }
          throw new Error(detail || 'Failed to build export bundle');
        }
        const bundle = await resp.json();
        return { ...out, manifest: bundle?.manifest ?? out.manifest };
      } catch (e) {
        throw e;
      }
    },
  },

  // Field resolvers from production core
  Entity: coreResolvers.Entity,
  Relationship: coreResolvers.Relationship,
  Investigation: coreResolvers.Investigation,
};

export default resolvers;
