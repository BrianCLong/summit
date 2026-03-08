"use strict";
// @ts-nocheck
/**
 * GraphQL Resolvers for Explainable Defense AI
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExplainableDefenseAIResolvers = void 0;
const index_js_1 = require("./index.js");
exports.ExplainableDefenseAIResolvers = {
    Query: {
        /**
         * Get chain of trust for an intelligence product
         */
        chainOfTrust: async (_, { productId }, context) => {
            if (context.authorize) {
                await context.authorize('xai:read');
            }
            const xai = (0, index_js_1.getExplainableDefenseAI)();
            const verification = xai.verifyChainOfTrust(productId);
            return {
                ...verification,
                nodes: [], // Chain nodes returned separately for security
            };
        },
        /**
         * Get audit trail with optional filters
         */
        xaiAuditTrail: async (_, args, context) => {
            if (context.authorize) {
                await context.authorize('audit:read');
            }
            const xai = (0, index_js_1.getExplainableDefenseAI)();
            return xai.getAuditTrail({
                actor: args.actor,
                action: args.action,
                since: args.since ? new Date(args.since) : undefined,
            });
        },
        /**
         * Export complete audit manifest with Merkle root
         */
        xaiAuditManifest: async (_, __, context) => {
            if (context.authorize) {
                await context.authorize('audit:export');
            }
            const xai = (0, index_js_1.getExplainableDefenseAI)();
            return xai.exportAuditManifest();
        },
        /**
         * Generate human-readable report for a decision
         */
        xaiDecisionReport: async (_, { explanation }, context) => {
            if (context.authorize) {
                await context.authorize('xai:read');
            }
            const xai = (0, index_js_1.getExplainableDefenseAI)();
            return xai.generateHumanReadableReport(explanation);
        },
    },
    Mutation: {
        /**
         * Ingest data with full provenance tracking
         */
        xaiIngestData: async (_, args, context) => {
            if (context.authorize) {
                await context.authorize('xai:ingest');
            }
            const xai = (0, index_js_1.getExplainableDefenseAI)();
            return xai.ingestData(args.source, args.rawData, args.extractedEvidence);
        },
        /**
         * Perform analysis with full explainability
         */
        xaiAnalyze: async (_, args, context) => {
            if (context.authorize) {
                await context.authorize('xai:analyze');
            }
            const xai = (0, index_js_1.getExplainableDefenseAI)();
            // Simple analysis function for demonstration
            const analysisFn = async (inputs) => {
                const avgConfidence = inputs.reduce((sum, e) => sum + e.confidence, 0) / inputs.length;
                return {
                    result: { score: avgConfidence, itemCount: inputs.length },
                    features: inputs.map((e, i) => ({
                        feature: `evidence_${i}`,
                        value: e.confidence,
                        weight: 1 / inputs.length,
                        contribution: e.confidence / inputs.length,
                        direction: e.confidence > 0.7 ? 'positive' : e.confidence < 0.3 ? 'negative' : 'neutral',
                        explanation: `Evidence item ${i} contributed ${(e.confidence * 100).toFixed(1)}% confidence`,
                    })),
                };
            };
            return xai.analyzeWithExplanation(args.analysisType, args.evidence, analysisFn);
        },
        /**
         * Prioritize items with full justification
         */
        xaiPrioritize: async (_, args, context) => {
            if (context.authorize) {
                await context.authorize('xai:prioritize');
            }
            const xai = (0, index_js_1.getExplainableDefenseAI)();
            const criteria = args.criteriaWeights.map((c) => ({
                name: c.name,
                weight: c.weight,
                evaluator: (item) => {
                    const data = item;
                    const value = data[c.field];
                    return typeof value === 'number' ? Math.min(1, Math.max(0, value)) : 0.5;
                },
            }));
            return xai.prioritizeWithJustification(args.items, criteria);
        },
        /**
         * Fuse intelligence from multiple sources
         */
        xaiFuseIntelligence: async (_, args, context) => {
            if (context.authorize) {
                await context.authorize('xai:fuse');
            }
            const xai = (0, index_js_1.getExplainableDefenseAI)();
            return xai.fuseIntelligence(args.sources, args.strategy);
        },
        /**
         * Verify chain of trust integrity
         */
        xaiVerifyChain: async (_, { productId }, context) => {
            if (context.authorize) {
                await context.authorize('xai:verify');
            }
            const xai = (0, index_js_1.getExplainableDefenseAI)();
            return xai.verifyChainOfTrust(productId);
        },
    },
};
exports.default = exports.ExplainableDefenseAIResolvers;
