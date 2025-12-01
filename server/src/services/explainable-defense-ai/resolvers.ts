/**
 * GraphQL Resolvers for Explainable Defense AI
 */

import { getExplainableDefenseAI } from './index.js';
import type {
  DataSource,
  EvidenceItem,
  DecisionExplanation,
  IntelligenceProduct,
  ChainOfTrustNode,
} from './ExplainableDefenseAI.js';

interface Context {
  userId?: string;
  authorize?: (permission: string) => Promise<void>;
}

export const ExplainableDefenseAIResolvers = {
  Query: {
    /**
     * Get chain of trust for an intelligence product
     */
    chainOfTrust: async (
      _: unknown,
      { productId }: { productId: string },
      context: Context,
    ): Promise<{ valid: boolean; issues: string[]; verificationReport: string; nodes: ChainOfTrustNode[] }> => {
      if (context.authorize) {
        await context.authorize('xai:read');
      }

      const xai = getExplainableDefenseAI();
      const verification = xai.verifyChainOfTrust(productId);

      return {
        ...verification,
        nodes: [], // Chain nodes returned separately for security
      };
    },

    /**
     * Get audit trail with optional filters
     */
    xaiAuditTrail: async (
      _: unknown,
      args: { actor?: string; action?: string; since?: string },
      context: Context,
    ) => {
      if (context.authorize) {
        await context.authorize('audit:read');
      }

      const xai = getExplainableDefenseAI();
      return xai.getAuditTrail({
        actor: args.actor,
        action: args.action,
        since: args.since ? new Date(args.since) : undefined,
      });
    },

    /**
     * Export complete audit manifest with Merkle root
     */
    xaiAuditManifest: async (_: unknown, __: unknown, context: Context) => {
      if (context.authorize) {
        await context.authorize('audit:export');
      }

      const xai = getExplainableDefenseAI();
      return xai.exportAuditManifest();
    },

    /**
     * Generate human-readable report for a decision
     */
    xaiDecisionReport: async (
      _: unknown,
      { explanation }: { explanation: DecisionExplanation },
      context: Context,
    ): Promise<string> => {
      if (context.authorize) {
        await context.authorize('xai:read');
      }

      const xai = getExplainableDefenseAI();
      return xai.generateHumanReadableReport(explanation);
    },
  },

  Mutation: {
    /**
     * Ingest data with full provenance tracking
     */
    xaiIngestData: async (
      _: unknown,
      args: {
        source: DataSource;
        rawData: unknown;
        extractedEvidence: Array<Omit<EvidenceItem, 'id' | 'contentHash'>>;
      },
      context: Context,
    ) => {
      if (context.authorize) {
        await context.authorize('xai:ingest');
      }

      const xai = getExplainableDefenseAI();
      return xai.ingestData(args.source, args.rawData, args.extractedEvidence);
    },

    /**
     * Perform analysis with full explainability
     */
    xaiAnalyze: async (
      _: unknown,
      args: {
        analysisType: DecisionExplanation['decisionType'];
        evidenceIds: string[];
        evidence: EvidenceItem[];
      },
      context: Context,
    ) => {
      if (context.authorize) {
        await context.authorize('xai:analyze');
      }

      const xai = getExplainableDefenseAI();

      // Simple analysis function for demonstration
      const analysisFn = async (inputs: EvidenceItem[]) => {
        const avgConfidence = inputs.reduce((sum, e) => sum + e.confidence, 0) / inputs.length;
        return {
          result: { score: avgConfidence, itemCount: inputs.length },
          features: inputs.map((e, i) => ({
            feature: `evidence_${i}`,
            value: e.confidence,
            weight: 1 / inputs.length,
            contribution: e.confidence / inputs.length,
            direction: e.confidence > 0.7 ? 'positive' : e.confidence < 0.3 ? 'negative' : 'neutral' as const,
            explanation: `Evidence item ${i} contributed ${(e.confidence * 100).toFixed(1)}% confidence`,
          })),
        };
      };

      return xai.analyzeWithExplanation(args.analysisType, args.evidence, analysisFn);
    },

    /**
     * Prioritize items with full justification
     */
    xaiPrioritize: async (
      _: unknown,
      args: {
        items: Array<{ id: string; data: Record<string, unknown>; evidence: EvidenceItem[] }>;
        criteriaWeights: Array<{ name: string; weight: number; field: string }>;
      },
      context: Context,
    ) => {
      if (context.authorize) {
        await context.authorize('xai:prioritize');
      }

      const xai = getExplainableDefenseAI();

      const criteria = args.criteriaWeights.map((c) => ({
        name: c.name,
        weight: c.weight,
        evaluator: (item: unknown) => {
          const data = item as Record<string, unknown>;
          const value = data[c.field];
          return typeof value === 'number' ? Math.min(1, Math.max(0, value)) : 0.5;
        },
      }));

      return xai.prioritizeWithJustification(args.items, criteria);
    },

    /**
     * Fuse intelligence from multiple sources
     */
    xaiFuseIntelligence: async (
      _: unknown,
      args: {
        sources: Array<{ source: DataSource; evidence: EvidenceItem[] }>;
        strategy: 'WEIGHTED_CONSENSUS' | 'BAYESIAN' | 'DEMPSTER_SHAFER' | 'MAJORITY_VOTE';
      },
      context: Context,
    ): Promise<IntelligenceProduct> => {
      if (context.authorize) {
        await context.authorize('xai:fuse');
      }

      const xai = getExplainableDefenseAI();
      return xai.fuseIntelligence(args.sources, args.strategy);
    },

    /**
     * Verify chain of trust integrity
     */
    xaiVerifyChain: async (
      _: unknown,
      { productId }: { productId: string },
      context: Context,
    ) => {
      if (context.authorize) {
        await context.authorize('xai:verify');
      }

      const xai = getExplainableDefenseAI();
      return xai.verifyChainOfTrust(productId);
    },
  },
};

export default ExplainableDefenseAIResolvers;
