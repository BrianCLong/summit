/**
 * GraphQL Resolvers for Anomaly Time-Warp Engine
 */

import { TimeWarpEngine, createTimeWarpEngine } from '../TimeWarpEngine.js';

let engine: TimeWarpEngine | null = null;

function getEngine(): TimeWarpEngine {
  if (!engine) {
    engine = createTimeWarpEngine();
  }
  return engine;
}

export const timeWarpResolvers = {
  Query: {
    predictAnomalies: async (
      _parent: unknown,
      args: { domain: string; data?: unknown[]; horizon?: number },
    ) => {
      const e = getEngine();
      if (args.horizon) {
        e.setDetectionWindow(args.horizon);
      }
      const result = await e.predictAnomalies(args.data || [], args.domain);
      return result.predictions;
    },

    getPrecursors: async (
      _parent: unknown,
      args: { anomalyId: string; historicalData?: unknown[] },
    ) => {
      const e = getEngine();

      // Check if precursors already extracted
      let precursors = e.getPrecursors(args.anomalyId);
      if (precursors.length === 0 && args.historicalData) {
        const result = await e.extractPrecursors(
          args.anomalyId,
          args.historicalData,
        );
        precursors = result.signals;
      }

      return precursors;
    },

    getWarpedTimeline: async (
      _parent: unknown,
      args: { anomalyId: string },
    ) => {
      const e = getEngine();

      let timeline = e.getTimeline(args.anomalyId);
      if (!timeline) {
        const result = await e.generateWarpedTimeline(args.anomalyId);
        timeline = result.timeline;
      }

      return timeline;
    },

    planIntervention: async (
      _parent: unknown,
      args: { anomalyId: string },
    ) => {
      const e = getEngine();
      return e.planIntervention(args.anomalyId);
    },

    getAllPredictions: (
      _parent: unknown,
      args: { minProbability?: number },
    ) => {
      const e = getEngine();
      let predictions = e.getAllPredictions();

      if (args.minProbability !== undefined) {
        predictions = predictions.filter(
          (p) => p.probability >= args.minProbability!,
        );
      }

      return predictions;
    },
  },

  Mutation: {
    monitorForAnomalies: async (
      _parent: unknown,
      args: { domain: string; data: unknown[] },
    ) => {
      const e = getEngine();
      const detectedAnomalies: string[] = [];

      await e.monitorForAnomalies(args.data, args.domain, (prediction) => {
        detectedAnomalies.push(prediction.id);
      });

      return {
        detected: detectedAnomalies.length,
        anomalyIds: detectedAnomalies,
      };
    },

    setDetectionWindow: (
      _parent: unknown,
      args: { windowHours: number },
    ) => {
      const e = getEngine();
      e.setDetectionWindow(args.windowHours);
      return true;
    },

    executeIntervention: async (
      _parent: unknown,
      args: { interventionId: string },
    ) => {
      // In production, would execute the intervention
      return {
        success: true,
        interventionId: args.interventionId,
        executedAt: new Date(),
      };
    },

    runFullAnalysis: async (
      _parent: unknown,
      args: { domain: string; data?: unknown[] },
    ) => {
      const e = getEngine();
      return e.runFullAnalysis(args.data || [], args.domain);
    },

    clearHistory: () => {
      getEngine().clearHistory();
      return true;
    },
  },
};

export default timeWarpResolvers;
