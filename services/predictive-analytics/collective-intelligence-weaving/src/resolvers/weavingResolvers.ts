/**
 * GraphQL Resolvers for Collective Intelligence Future Weaving
 */

import { FutureWeaver, createFutureWeaver, WeaveRequest } from '../FutureWeaver.js';
import { RegisterSourceInput, SourceType } from '../models/IntelligenceSource.js';
import { SubmitSignalInput } from '../models/PredictiveSignal.js';
import { ResolutionMethod } from '../models/SignalBraid.js';
import { FusionMethod } from '../algorithms/SignalFuser.js';

// Singleton weaver instance
let weaver: FutureWeaver | null = null;

function getWeaver(): FutureWeaver {
  if (!weaver) {
    weaver = createFutureWeaver();
  }
  return weaver;
}

export const weavingResolvers = {
  Query: {
    getFutureFabric: (
      _parent: unknown,
      args: { domain: string; horizon?: number; minConfidence?: number },
    ) => {
      const w = getWeaver();
      const fabric = w.getFabricByDomain(args.domain);

      if (!fabric) {
        // Try to weave a new fabric
        const result = w.weaveFuture({
          domains: [args.domain],
          horizon: args.horizon || 24,
        });
        return result.fabric;
      }

      if (
        args.minConfidence &&
        fabric.overallConfidence < args.minConfidence
      ) {
        throw new Error(
          `Fabric confidence ${fabric.overallConfidence} below threshold ${args.minConfidence}`,
        );
      }

      return fabric;
    },

    getBraid: (_parent: unknown, args: { braidId: string }) => {
      const w = getWeaver();
      const braid = w.getBraid(args.braidId);
      if (!braid) {
        throw new Error(`Braid not found: ${args.braidId}`);
      }
      return braid;
    },

    getBraids: (
      _parent: unknown,
      args: { domain: string; limit?: number; offset?: number },
    ) => {
      const w = getWeaver();
      let braids = w.getBraidsByDomain(args.domain);

      if (args.offset) {
        braids = braids.slice(args.offset);
      }
      if (args.limit) {
        braids = braids.slice(0, args.limit);
      }

      return braids;
    },

    getTrustScores: (
      _parent: unknown,
      args: { sourceType?: SourceType; minScore?: number },
    ) => {
      const w = getWeaver();
      let scores = w.getAllTrustScores();

      if (args.sourceType) {
        const sources = w.getAllSources();
        const sourceIds = sources
          .filter((s) => s.type === args.sourceType)
          .map((s) => s.id);
        scores = scores.filter((s) => sourceIds.includes(s.sourceId));
      }

      if (args.minScore !== undefined) {
        scores = scores.filter((s) => s.overallScore >= args.minScore!);
      }

      return scores;
    },

    getSourceTrust: (_parent: unknown, args: { sourceId: string }) => {
      const w = getWeaver();
      const score = w.getTrustScore(args.sourceId);
      if (!score) {
        throw new Error(`Trust score not found for source: ${args.sourceId}`);
      }
      return score;
    },

    getConflicts: (
      _parent: unknown,
      args: { domain?: string; minDivergence?: number; unresolved?: boolean },
    ) => {
      const w = getWeaver();
      const conflicts = w.getConflicts(args.domain);

      // Filter by divergence if specified
      return conflicts
        .filter((c) => {
          if (args.minDivergence && c.braid.coherence > 1 - args.minDivergence) {
            return false;
          }
          if (args.unresolved && c.braid.conflicts.length > 0) {
            return false;
          }
          return true;
        })
        .flatMap((c) => c.braid.conflicts);
    },

    getSources: (
      _parent: unknown,
      args: { type?: SourceType; minTrust?: number },
    ) => {
      const w = getWeaver();
      let sources = w.getAllSources();

      if (args.type) {
        sources = sources.filter((s) => s.type === args.type);
      }

      if (args.minTrust !== undefined) {
        const scores = w.getAllTrustScores();
        const trustedIds = scores
          .filter((s) => s.overallScore >= args.minTrust!)
          .map((s) => s.sourceId);
        sources = sources.filter((s) => trustedIds.includes(s.id));
      }

      return sources;
    },

    getDivergenceZones: (
      _parent: unknown,
      args: { fabricId: string; minDivergence?: number },
    ) => {
      const w = getWeaver();
      const fabric = w.getFabric(args.fabricId);
      if (!fabric) {
        throw new Error(`Fabric not found: ${args.fabricId}`);
      }

      let zones = fabric.divergenceZones;
      if (args.minDivergence !== undefined) {
        zones = zones.filter((z) => z.divergenceScore >= args.minDivergence!);
      }

      return zones;
    },

    getWeavingConfig: (_parent: unknown, _args: { configId: string }) => {
      // Return current config - in production, would fetch from DB
      return {
        id: 'default',
        name: 'Default Configuration',
        fusionMethod: FusionMethod.ENSEMBLE_VOTING,
        conflictThreshold: 0.3,
        minSourcesRequired: 1,
        trustDecayRate: 0.01,
        temporalWeight: 0.1,
      };
    },
  },

  Mutation: {
    registerSource: (_parent: unknown, args: { input: RegisterSourceInput }) => {
      const w = getWeaver();
      return w.registerSource(args.input);
    },

    submitSignal: (_parent: unknown, args: { input: SubmitSignalInput }) => {
      const w = getWeaver();
      return w.submitSignal(args.input);
    },

    resolveConflict: (
      _parent: unknown,
      args: {
        input: {
          conflictId: string;
          method: ResolutionMethod;
          resolvedValue?: unknown;
          reasoning?: string;
          expertOverride?: boolean;
        };
      },
    ) => {
      // In production, would fetch conflict and resolve
      return {
        id: args.input.conflictId,
        conflictingSignalIds: [],
        resolvedValue: args.input.resolvedValue,
        resolutionMethod: args.input.method,
        confidence: 0.8,
        reasoning: args.input.reasoning || 'Manual resolution',
        resolvedAt: new Date(),
      };
    },

    weaveFuture: (
      _parent: unknown,
      args: {
        input: {
          domains: string[];
          horizon: number;
          minSources?: number;
          fusionMethod?: FusionMethod;
        };
      },
    ) => {
      const w = getWeaver();
      const request: WeaveRequest = {
        domains: args.input.domains,
        horizon: args.input.horizon,
        minSources: args.input.minSources,
        fusionMethod: args.input.fusionMethod,
      };
      const result = w.weaveFuture(request);
      return result.fabric;
    },

    updateTrust: (
      _parent: unknown,
      args: { sourceId: string; adjustment: number; reason: string },
    ) => {
      const w = getWeaver();
      return w.updateTrust(args.sourceId, args.adjustment, args.reason);
    },

    setWeavingConfig: (
      _parent: unknown,
      args: {
        input: {
          name: string;
          fusionMethod: FusionMethod;
          conflictThreshold: number;
          minSourcesRequired: number;
          trustDecayRate?: number;
          temporalWeight?: number;
        };
      },
    ) => {
      // In production, would persist to DB
      return {
        id: crypto.randomUUID(),
        ...args.input,
        trustDecayRate: args.input.trustDecayRate ?? 0.01,
        temporalWeight: args.input.temporalWeight ?? 0.1,
      };
    },

    deregisterSource: (_parent: unknown, args: { sourceId: string }) => {
      const w = getWeaver();
      return w.deregisterSource(args.sourceId);
    },

    invalidateSignal: (
      _parent: unknown,
      args: { signalId: string; reason: string },
    ) => {
      const w = getWeaver();
      return w.invalidateSignal(args.signalId, args.reason);
    },
  },

  // Field resolvers
  IntelligenceSource: {
    lastSignal: (source: { lastSignal?: Date }) => source.lastSignal || null,
  },

  SignalBraid: {
    signals: (braid: { signalIds: string[] }) => {
      const w = getWeaver();
      return braid.signalIds
        .map((id) => w.getSignal(id))
        .filter((s) => s !== undefined);
    },
  },

  PredictiveSignal: {
    source: (signal: { sourceId: string }) => {
      const w = getWeaver();
      return w.getSource(signal.sourceId);
    },
  },

  TrustScore: {
    source: (score: { sourceId: string }) => {
      const w = getWeaver();
      return w.getSource(score.sourceId);
    },
  },
};

export default weavingResolvers;
