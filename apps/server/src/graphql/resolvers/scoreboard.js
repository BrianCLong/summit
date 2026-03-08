"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.scoreboardResolvers = void 0;
const scoreboardService_js_1 = require("../../scoreboard/scoreboardService.js");
exports.scoreboardResolvers = {
    Query: {
        scoreboards: () => scoreboardService_js_1.scoreboardService.listScoreboards(),
        domainScoreboard: (_, { domainId }) => scoreboardService_js_1.scoreboardService.getDomainScoreboard(domainId),
    },
    Mutation: {
        upsertDomainMetrics: (_, { input }) => {
            return scoreboardService_js_1.scoreboardService.upsertDomainMetrics(input);
        },
        logDecision: (_, { input }) => {
            return scoreboardService_js_1.scoreboardService.logDecision(input);
        },
        registerException: (_, { input }) => {
            return scoreboardService_js_1.scoreboardService.registerException(input);
        },
        registerReleaseEnvelope: (_, { input }) => {
            return scoreboardService_js_1.scoreboardService.registerReleaseEnvelope(input);
        },
    },
    DomainScoreboard: {
        health: (scoreboard) => scoreboard.health,
    },
    DomainMetrics: {
        onCall: (scoreboardMetrics) => ({
            ...scoreboardMetrics.onCall,
            status: scoreboardService_js_1.scoreboardService.getDomainScoreboard(scoreboardMetrics.domainId)?.health.onCall ?? 'GOOD',
        }),
    },
};
