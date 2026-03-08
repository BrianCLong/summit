"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.riskResolvers = void 0;
const RiskService_js_1 = require("../risk/RiskService.js");
const service = new RiskService_js_1.RiskService();
exports.riskResolvers = {
    Query: {
        riskSummary: async (_, { entityId, window }) => {
            const res = await service.compute(entityId, window);
            return {
                entityId,
                score: res.score,
                band: res.band,
                window: res.window,
                topContributions: res.contributions.slice(0, 5),
            };
        },
        topRiskEntities: async () => [],
    },
};
