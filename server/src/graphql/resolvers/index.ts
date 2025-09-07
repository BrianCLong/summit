// Production Core Resolvers (replaces demo resolvers)
import { coreResolvers } from './core.js';

// Legacy resolvers (kept for backward compatibility during migration)
import entityResolvers from './entity';
import relationshipResolvers from './relationship';
import userResolvers from './user';
import investigationResolvers from './investigation';
import { WargameResolver } from '../../resolvers/WargameResolver.js'; // WAR-GAMED SIMULATION - FOR DECISION SUPPORT ONLY
import { SafeMutationsResolvers } from '../resolvers/safe-mutations.js';

// Instantiate the WargameResolver
const wargameResolver = new WargameResolver(); // WAR-GAMED SIMULATION - FOR DECISION SUPPORT ONLY

const resolvers = {
  // Core scalars from production resolvers
  DateTime: coreResolvers.DateTime,
  JSON: coreResolvers.JSON,

  Query: {
    // Production core resolvers (PostgreSQL + Neo4j)
    ...coreResolvers.Query,
    async pipeline(_p: any, args: { id: string }) {
      const { getPipelineDef } = await import('../../db/repositories/pipelines.js');
      return await getPipelineDef(args.id);
    },
    async tickets(_p: any, args: { limit?: number; offset?: number; provider?: string; assignee?: string; label?: string; project?: string; repo?: string }) {
      const { listTickets } = await import('../../db/repositories/tickets.js');
      return await listTickets(args?.limit ?? 50, args?.offset ?? 0, {
        provider: args.provider as any,
        assignee: args.assignee,
        label: args.label,
        project: args.project,
        repo: args.repo,
      });
    },

    // Legacy resolvers (will be phased out)
    ...entityResolvers.Query,
    ...userResolvers.Query,
    ...investigationResolvers.Query,

    // WAR-GAMED SIMULATION - FOR DECISION SUPPORT ONLY (temporarily disabled due to schema mismatch)
    // getCrisisTelemetry: wargameResolver.getCrisisTelemetry.bind(wargameResolver),
    // getAdversaryIntentEstimates: wargameResolver.getAdversaryIntentEstimates.bind(wargameResolver),
    // getNarrativeHeatmapData: wargameResolver.getNarrativeHeatmapData.bind(wargameResolver),
    // getStrategicResponsePlaybooks: wargameResolver.getStrategicResponsePlaybooks.bind(wargameResolver),
    // getCrisisScenario: wargameResolver.getCrisisScenario.bind(wargameResolver),
    // getAllCrisisScenarios: wargameResolver.getAllCrisisScenarios.bind(wargameResolver),
  },

  Mutation: {
    // Production core resolvers
    ...coreResolvers.Mutation,

    // Legacy resolvers (will be phased out)
    ...entityResolvers.Mutation,
    ...relationshipResolvers.Mutation,
    ...userResolvers.Mutation,
    ...investigationResolvers.Mutation,

    // Safe orchestration mutations (idempotent/dry-run aware)
    ...SafeMutationsResolvers.Mutation,

    // WAR-GAMED SIMULATION - FOR DECISION SUPPORT ONLY (temporarily disabled due to schema mismatch)
    // runWarGameSimulation: wargameResolver.runWarGameSimulation.bind(wargameResolver),
    // updateCrisisScenario: wargameResolver.updateCrisisScenario.bind(wargameResolver),
    // deleteCrisisScenario: wargameResolver.deleteCrisisScenario.bind(wargameResolver),
    async approvePromotion(_p: any, args: { promotionId: string; verdict: string; notes?: string; meta: any }, ctx: any) {
      const role = ctx?.user?.role || 'VIEWER';
      if (role !== 'ADMIN' && role !== 'OPERATOR') {
        return { status: 'BLOCKED_BY_POLICY', warnings: ['Insufficient role'], diff: { promotionId: args.promotionId, verdict: args.verdict }, auditId: `audit-${Date.now()}` };
      }
      // TODO: persist approval decision and emit events
      return { status: 'APPROVED', warnings: [], diff: { promotionId: args.promotionId, verdict: args.verdict }, auditId: `audit-${Date.now()}` };
    },
    async savePipeline(_p: any, args: { id: string; name: string; nodes: any[]; edges: any[]; meta: any }) {
      const { savePipelineDef } = await import('../../db/repositories/pipelines.js');
      await savePipelineDef(args.id, args.name, args.nodes || [], args.edges || []);
      return { status: 'SAVED', warnings: [], diff: { id: args.id, name: args.name, nodes: args.nodes?.length || 0, edges: args.edges?.length || 0 }, auditId: `audit-${Date.now()}` };
    },
  },

  // Field resolvers from production core (temporarily disabled due to schema mismatch)
  // Entity: coreResolvers.Entity,
  // Relationship: coreResolvers.Relationship,
  // Investigation: coreResolvers.Investigation,
    async uatCheckpoints(_p: any, args: { runId: string }) {
      const { listUATCheckpoints } = await import('../../db/repositories/uat.js');
      return await listUATCheckpoints(args.runId);
    },
};

export default resolvers;
  Ticket: {
    runs: async (parent: any) => {
      const { listTicketRuns } = await import('../../db/repositories/tickets.js');
      return await listTicketRuns(parent.provider, parent.external_id);
    },
    deployments: async (parent: any) => {
      const { listTicketDeployments } = await import('../../db/repositories/tickets.js');
      return await listTicketDeployments(parent.provider, parent.external_id);
    },
  },
