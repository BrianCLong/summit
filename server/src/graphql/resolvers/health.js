"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const aggregator_js_1 = require("../../../health/aggregator.js");
const healthResolvers = {
    Query: {
        healthScore: () => (0, aggregator_js_1.getHealthScore)(),
    },
};
exports.default = healthResolvers;
