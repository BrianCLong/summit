/**
 * GraphQL Resolvers for Predictive Integrity Shield
 */

import { IntegrityShield, createIntegrityShield, PredictionInput } from '../IntegrityShield.js';

let shield: IntegrityShield | null = null;

function getShield(): IntegrityShield {
  if (!shield) {
    shield = createIntegrityShield();
  }
  return shield;
}

export const integrityResolvers = {
  Query: {
    getIntegrityStatus: () => {
      return getShield().getStatus();
    },

    checkDrift: async (
      _parent: unknown,
      args: { modelId: string; windowSize?: number },
    ) => {
      const s = getShield();
      const report = await s.runFullCheck();
      return report.driftMetrics.filter(
        (m) => args.modelId === 'all' || m.modelId === args.modelId,
      );
    },

    analyzeBias: async (
      _parent: unknown,
      args: { modelId: string; dimensions?: string[] },
    ) => {
      const s = getShield();
      const report = await s.runFullCheck();
      let indicators = report.biasIndicators;

      if (args.dimensions) {
        indicators = indicators.filter((i) =>
          args.dimensions!.includes(i.dimension),
        );
      }

      return indicators;
    },

    getReliabilityScore: async (
      _parent: unknown,
      args: { modelId: string },
    ) => {
      const s = getShield();
      const reports = s.getRecentReports(50);
      const modelReports = reports.filter(
        (r) => r.modelId === args.modelId || args.modelId === 'all',
      );

      if (modelReports.length === 0) return 1.0;

      return (
        modelReports.reduce((sum, r) => sum + r.reliabilityScore, 0) /
        modelReports.length
      );
    },

    getRecentAlerts: (
      _parent: unknown,
      args: { count?: number; severity?: string },
    ) => {
      const s = getShield();
      let reports = s.getRecentReports(args.count || 20);

      if (args.severity === 'high') {
        reports = reports.filter((r) => r.reliabilityScore < 0.5);
      } else if (args.severity === 'medium') {
        reports = reports.filter(
          (r) => r.reliabilityScore >= 0.5 && r.reliabilityScore < 0.7,
        );
      }

      return reports;
    },
  },

  Mutation: {
    enableShield: (
      _parent: unknown,
      args: { config?: { driftThreshold?: number; autoHealEnabled?: boolean } },
    ) => {
      shield = createIntegrityShield(args.config);
      return getShield().getStatus();
    },

    runIntegrityCheck: async (
      _parent: unknown,
      args: { prediction: PredictionInput },
    ) => {
      const s = getShield();
      return s.checkPrediction(args.prediction);
    },

    triggerSelfHeal: async (
      _parent: unknown,
      args: { reportId: string },
    ) => {
      const s = getShield();
      const reports = s.getRecentReports(100);
      const report = reports.find((r) => r.id === args.reportId);

      if (!report) {
        throw new Error(`Report not found: ${args.reportId}`);
      }

      const actions = await s.triggerSelfHeal(report);
      return {
        success: true,
        actions,
      };
    },

    clearHistory: () => {
      getShield().clearHistory();
      return true;
    },
  },
};

export default integrityResolvers;
