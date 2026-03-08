"use strict";
/**
 * Strategic Foresight AI Suite - GraphQL Resolvers
 *
 * Provides resolvers for predictive analytics, scenario planning,
 * and strategic recommendations.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.strategicForesightResolvers = void 0;
const strategic_foresight_client_js_1 = require("../services/strategic-foresight-client.js");
const client = new strategic_foresight_client_js_1.StrategicForesightClient();
exports.strategicForesightResolvers = {
    Query: {
        /**
         * Perform comprehensive strategic foresight analysis
         */
        strategicForesight: async (_parent, { input }, context) => {
            if (context.authorize) {
                await context.authorize('foresight:read');
            }
            return client.analyze(input);
        },
        /**
         * Get market trend predictions
         */
        marketTrends: async (_parent, { input }, context) => {
            if (context.authorize) {
                await context.authorize('foresight:read');
            }
            return client.getMarketTrends(input);
        },
        /**
         * Identify competitive threats
         */
        competitiveThreats: async (_parent, { competitors, domain }, context) => {
            if (context.authorize) {
                await context.authorize('foresight:read');
            }
            return client.getCompetitiveThreats(competitors, domain);
        },
        /**
         * Find partnership opportunities
         */
        partnershipOpportunities: async (_parent, { domain, capabilities }, context) => {
            if (context.authorize) {
                await context.authorize('foresight:read');
            }
            return client.getPartnershipOpportunities(domain, capabilities || []);
        },
        /**
         * Generate strategic scenarios
         */
        strategicScenarios: async (_parent, { input }, context) => {
            if (context.authorize) {
                await context.authorize('foresight:read');
            }
            return client.getScenarios(input);
        },
        /**
         * Analyze pivot opportunities
         */
        pivotOpportunities: async (_parent, { input }, context) => {
            if (context.authorize) {
                await context.authorize('foresight:read');
            }
            return client.getPivotOpportunities(input);
        },
    },
};
