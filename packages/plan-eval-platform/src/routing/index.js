"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAdaptiveRouter = exports.AdaptiveRouter = exports.createGreedyCostRouter = exports.GreedyCostRouter = exports.createRandomRouter = exports.RandomRouter = exports.createCandidatesFromScenario = exports.BaseRouter = void 0;
exports.createRouter = createRouter;
var base_router_js_1 = require("./base-router.js");
Object.defineProperty(exports, "BaseRouter", { enumerable: true, get: function () { return base_router_js_1.BaseRouter; } });
Object.defineProperty(exports, "createCandidatesFromScenario", { enumerable: true, get: function () { return base_router_js_1.createCandidatesFromScenario; } });
var random_router_js_1 = require("./random-router.js");
Object.defineProperty(exports, "RandomRouter", { enumerable: true, get: function () { return random_router_js_1.RandomRouter; } });
Object.defineProperty(exports, "createRandomRouter", { enumerable: true, get: function () { return random_router_js_1.createRandomRouter; } });
var greedy_cost_router_js_1 = require("./greedy-cost-router.js");
Object.defineProperty(exports, "GreedyCostRouter", { enumerable: true, get: function () { return greedy_cost_router_js_1.GreedyCostRouter; } });
Object.defineProperty(exports, "createGreedyCostRouter", { enumerable: true, get: function () { return greedy_cost_router_js_1.createGreedyCostRouter; } });
var adaptive_router_js_1 = require("./adaptive-router.js");
Object.defineProperty(exports, "AdaptiveRouter", { enumerable: true, get: function () { return adaptive_router_js_1.AdaptiveRouter; } });
Object.defineProperty(exports, "createAdaptiveRouter", { enumerable: true, get: function () { return adaptive_router_js_1.createAdaptiveRouter; } });
const random_router_js_2 = require("./random-router.js");
const greedy_cost_router_js_2 = require("./greedy-cost-router.js");
const adaptive_router_js_2 = require("./adaptive-router.js");
/**
 * Factory function to create routers by type
 */
function createRouter(type, config) {
    switch (type) {
        case 'random':
            return new random_router_js_2.RandomRouter(config);
        case 'greedy_cost':
            return new greedy_cost_router_js_2.GreedyCostRouter(config);
        case 'adaptive':
            return new adaptive_router_js_2.AdaptiveRouter(config);
        case 'quality_first':
            return new greedy_cost_router_js_2.GreedyCostRouter({ costWeight: 0, ...config });
        default:
            throw new Error(`Unknown router type: ${type}`);
    }
}
