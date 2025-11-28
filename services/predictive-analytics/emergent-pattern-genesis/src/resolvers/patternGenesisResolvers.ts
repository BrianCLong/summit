/**
 * GraphQL Resolvers for Emergent Pattern Genesis
 */

import { PatternGenesisEngine, createPatternGenesisEngine } from '../PatternGenesisEngine.js';

let engine: PatternGenesisEngine | null = null;

function getEngine(): PatternGenesisEngine {
  if (!engine) {
    engine = createPatternGenesisEngine();
  }
  return engine;
}

export const patternGenesisResolvers = {
  Query: {
    detectProtoPatterns: async (
      _parent: unknown,
      args: { domain: string; data?: unknown[] },
    ) => {
      const e = getEngine();
      const result = await e.detectProtoPatterns(args.data || [], args.domain);
      return result.patterns;
    },

    predictMotifs: async (
      _parent: unknown,
      args: { domain: string; horizon?: number },
    ) => {
      const e = getEngine();
      return e.predictMotifs(args.domain, args.horizon || 24);
    },

    getCompetitions: (
      _parent: unknown,
      args: { domain?: string },
    ) => {
      const e = getEngine();
      let competitions = e.getCompetitions();

      if (args.domain) {
        competitions = competitions.filter((c) => c.domain === args.domain);
      }

      return competitions;
    },

    getDominantPatterns: async (
      _parent: unknown,
      args: { domain?: string; minScore?: number },
    ) => {
      const e = getEngine();
      let patterns = await e.getDominantPatterns(args.domain);

      if (args.minScore !== undefined) {
        patterns = patterns.filter((p) => p.score >= args.minScore!);
      }

      return patterns;
    },

    getProtoPattern: (
      _parent: unknown,
      args: { patternId: string },
    ) => {
      const e = getEngine();
      return e.getProtoPattern(args.patternId);
    },

    getMotif: (
      _parent: unknown,
      args: { motifId: string },
    ) => {
      const e = getEngine();
      return e.getMotif(args.motifId);
    },
  },

  Mutation: {
    seedPattern: (
      _parent: unknown,
      args: { name: string; domain: string; signature: unknown },
    ) => {
      const e = getEngine();
      return e.seedPattern(args.name, args.domain, args.signature);
    },

    runCompetition: async (
      _parent: unknown,
      args: { patternIds: string[] },
    ) => {
      const e = getEngine();
      const result = await e.runCompetition(args.patternIds);
      return result.competition;
    },

    evolvePattern: async (
      _parent: unknown,
      args: { patternId: string; environmentalFactors?: Record<string, number> },
    ) => {
      const e = getEngine();
      const result = await e.evolvePattern(
        args.patternId,
        args.environmentalFactors || {},
      );
      return result.motif;
    },

    runFullAnalysis: async (
      _parent: unknown,
      args: { domain: string; horizon: number; data?: unknown[] },
    ) => {
      const e = getEngine();
      return e.runFullAnalysis(args.data || [], args.domain, args.horizon);
    },
  },
};

export default patternGenesisResolvers;
