// Production Core Resolvers (replaces demo resolvers)
import { coreResolvers } from './core.js';

// Legacy resolvers (kept for backward compatibility during migration)
import entityResolvers from './entity';
import relationshipResolvers from './relationship';
import userResolvers from './user';
import investigationResolvers from './investigation';
import { WargameResolver } from '../../resolvers/WargameResolver.js'; // WAR-GAMED SIMULATION - FOR DECISION SUPPORT ONLY
import { SafeMutationsResolvers } from '../resolvers/safe-mutations.js';
import { triggerN8nFlow } from '../../integrations/n8n.js';
import { checkN8nTriggerAllowed } from '../../integrations/n8n-policy.js';
import { isEnabled as flagEnabled } from '../../featureFlags/flagsmith.js';

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
    
    async uatCheckpoints(_p: any, args: { runId: string }) {
      const { listUATCheckpoints } = await import('../../db/repositories/uat.js');
      return await listUATCheckpoints(args.runId);
    },
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

    // Integrations: n8n trigger (guarded by feature flag + RBAC)
    async triggerN8n(_p: any, args: { flowKey: string; runId: string; payload: any }, ctx: any) {
      const enabled = await flagEnabled('integrations.n8n.enabled').catch(() => false);
      if (!enabled) {
        throw new Error('n8n disabled');
      }
      const role = ctx?.user?.role || 'VIEWER';
      if (!['OPERATOR', 'ADMIN'].includes(role)) {
        throw new Error('forbidden');
      }
      // OPA + static policy
      const allow = await checkN8nTriggerAllowed({
        tenantId: ctx?.user?.tenantId || ctx?.req?.headers?.['x-tenant-id'],
        userId: ctx?.user?.id,
        role,
        flowKey: args.flowKey,
      });
      if (!allow.allow) throw new Error('policy blocked');

      const result = await triggerN8nFlow(
        args.flowKey,
        { runId: args.runId, payload: args.payload, user: ctx?.user?.id },
        { userId: ctx?.user?.id, runId: args.runId },
      );
      return result.status >= 200 && result.status < 300;
    },

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

    async startRecipe(_p: any, args: { name: string; inputs?: any }, ctx: any) {
      const { loadRecipe } = await import('../../recipes/loader.js');
      const fs = await import('fs');
      const path = await import('path');
      const crypto = await import('crypto');
      
      // Validate recipe exists
      const recipePath = path.join(process.cwd(), 'recipes', args.name);
      const recipeFiles = [
        `${args.name}.yaml`,
        `${args.name}.yml`,
        args.name.endsWith('.yaml') || args.name.endsWith('.yml') ? args.name : null
      ].filter(Boolean);
      
      let validRecipeFile = null;
      for (const file of recipeFiles) {
        const fullPath = path.join(process.cwd(), 'recipes', file);
        if (fs.existsSync(fullPath)) {
          validRecipeFile = file;
          break;
        }
      }
      
      if (!validRecipeFile) {
        throw new Error(`Recipe '${args.name}' not found. Available recipes: ${fs.readdirSync(path.join(process.cwd(), 'recipes')).filter(f => f.endsWith('.yaml') || f.endsWith('.yml')).join(', ')}`);
      }
      
      // Load and validate recipe
      let recipe;
      try {
        recipe = await loadRecipe(validRecipeFile);
        if (recipe.__error) {
          throw new Error(`Recipe loading error: ${recipe.__error}`);
        }
      } catch (error) {
        throw new Error(`Failed to load recipe '${args.name}': ${error.message}`);
      }
      
      // Validate inputs if recipe defines input schema
      const inputs = args.inputs || {};
      if (recipe.inputs && typeof recipe.inputs === 'object') {
        for (const [key, spec] of Object.entries(recipe.inputs)) {
          const inputSpec = spec as any;
          if (inputSpec.required && !(key in inputs)) {
            throw new Error(`Required input '${key}' is missing`);
          }
        }
      }
      
      // Check budget plugin requirement
      const requiresBudget = process.env.REQUIRE_BUDGET_PLUGIN === 'true';
      if (requiresBudget && !ctx?.budget) {
        throw new Error('Budget plugin is required but not available in context');
      }
      
      // Generate unique IDs
      const runId = `recipe-run-${crypto.randomUUID()}`;
      const auditId = `audit-${crypto.randomUUID()}`;
      
      // TODO: Enqueue job with your actual job queue (BullMQ, etc.)
      // For now, we'll simulate enqueueing
      console.log(`Enqueuing recipe execution: ${validRecipeFile} with inputs:`, inputs);
      
      // Create audit trail
      console.log(`Audit ${auditId}: Recipe ${validRecipeFile} started by ${ctx?.user?.id || 'anonymous'} with run ${runId}`);
      
      return {
        runId,
        auditId,
        status: 'QUEUED',
        recipe: validRecipeFile,
        inputs
      };
    },
  },

  // Field resolvers from production core (temporarily disabled due to schema mismatch)
  // Entity: coreResolvers.Entity,
  // Relationship: coreResolvers.Relationship,
  // Investigation: coreResolvers.Investigation,
  
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
  
};

export default resolvers;
