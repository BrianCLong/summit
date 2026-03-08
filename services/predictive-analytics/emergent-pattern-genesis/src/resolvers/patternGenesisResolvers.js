"use strict";
/**
 * GraphQL Resolvers for Emergent Pattern Genesis
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.patternGenesisResolvers = void 0;
const PatternGenesisEngine_js_1 = require("../PatternGenesisEngine.js");
let engine = null;
function getEngine() {
    if (!engine) {
        engine = (0, PatternGenesisEngine_js_1.createPatternGenesisEngine)();
    }
    return engine;
}
exports.patternGenesisResolvers = {
    Query: {
        detectProtoPatterns: async (_parent, args) => {
            const e = getEngine();
            const result = await e.detectProtoPatterns(args.data || [], args.domain);
            return result.patterns;
        },
        predictMotifs: async (_parent, args) => {
            const e = getEngine();
            return e.predictMotifs(args.domain, args.horizon || 24);
        },
        getCompetitions: (_parent, args) => {
            const e = getEngine();
            let competitions = e.getCompetitions();
            if (args.domain) {
                competitions = competitions.filter((c) => c.domain === args.domain);
            }
            return competitions;
        },
        getDominantPatterns: async (_parent, args) => {
            const e = getEngine();
            let patterns = await e.getDominantPatterns(args.domain);
            if (args.minScore !== undefined) {
                patterns = patterns.filter((p) => p.score >= args.minScore);
            }
            return patterns;
        },
        getProtoPattern: (_parent, args) => {
            const e = getEngine();
            return e.getProtoPattern(args.patternId);
        },
        getMotif: (_parent, args) => {
            const e = getEngine();
            return e.getMotif(args.motifId);
        },
    },
    Mutation: {
        seedPattern: (_parent, args) => {
            const e = getEngine();
            return e.seedPattern(args.name, args.domain, args.signature);
        },
        runCompetition: async (_parent, args) => {
            const e = getEngine();
            const result = await e.runCompetition(args.patternIds);
            return result.competition;
        },
        evolvePattern: async (_parent, args) => {
            const e = getEngine();
            const result = await e.evolvePattern(args.patternId, args.environmentalFactors || {});
            return result.motif;
        },
        runFullAnalysis: async (_parent, args) => {
            const e = getEngine();
            return e.runFullAnalysis(args.data || [], args.domain, args.horizon);
        },
    },
};
exports.default = exports.patternGenesisResolvers;
