/**
 * GraphQL Resolvers for Graph-Native Predictive Orchestration
 */

import { PredictiveOrchestrator, createOrchestrator } from '../PredictiveOrchestrator.js';

let orchestrator: PredictiveOrchestrator | null = null;

function getOrchestrator(): PredictiveOrchestrator {
  if (!orchestrator) {
    orchestrator = createOrchestrator();
  }
  return orchestrator;
}

export const orchestrationResolvers = {
  Query: {
    getBindings: (
      _parent: unknown,
      args: { nodeId?: string },
    ) => {
      const o = getOrchestrator();
      if (args.nodeId) {
        return o.getBindingsForNode(args.nodeId);
      }
      return [];
    },

    getActiveFlows: () => {
      return getOrchestrator().getActiveFlows();
    },

    getPathways: (
      _parent: unknown,
      args: { activeOnly?: boolean },
    ) => {
      const o = getOrchestrator();
      let pathways = o.getAllPathways();

      if (args.activeOnly) {
        pathways = pathways.filter((p) => p.active);
      }

      return pathways;
    },

    evaluateTriggers: () => {
      return getOrchestrator().evaluateTriggers();
    },

    getOrchestrationStatus: () => {
      return getOrchestrator().getStatus();
    },
  },

  Mutation: {
    bindPrediction: (
      _parent: unknown,
      args: {
        nodeId: string;
        predictionId: string;
        predictionValue: unknown;
        confidence: number;
      },
    ) => {
      const o = getOrchestrator();
      return o.bindPrediction(
        args.nodeId,
        args.predictionId,
        args.predictionValue,
        args.confidence,
      );
    },

    createFlow: (
      _parent: unknown,
      args: {
        name: string;
        triggerCondition: string;
        actions: string[];
      },
    ) => {
      const o = getOrchestrator();
      return o.createFlow(args.name, args.triggerCondition, args.actions);
    },

    rewirePathway: async (
      _parent: unknown,
      args: { pathwayId: string; reason: string },
    ) => {
      const o = getOrchestrator();
      return o.rewirePathway(args.pathwayId, args.reason);
    },

    executeDecision: async (
      _parent: unknown,
      args: { flowId: string },
    ) => {
      const o = getOrchestrator();
      return o.executeFlow(args.flowId);
    },

    createPathway: (
      _parent: unknown,
      args: {
        name: string;
        nodes: string[];
        transitions: Array<{ from: string; to: string; condition: string }>;
      },
    ) => {
      const o = getOrchestrator();
      return o.createPathway(args.name, args.nodes, args.transitions);
    },
  },
};

export default orchestrationResolvers;
