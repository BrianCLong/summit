"use strict";
/**
 * Explainable Defense AI Module
 *
 * Provides transparent, auditable AI for mission-critical defense decisions
 * with complete explainability from data ingest to actionable intelligence.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createChainNodeFromTrace = exports.convertExplanationToTrace = exports.convertTraceToExplanation = exports.unifiedXAI = exports.UnifiedXAIService = exports.ExplainableDefenseAIResolvers = exports.ExplainableDefenseAI = void 0;
exports.getExplainableDefenseAI = getExplainableDefenseAI;
exports.resetInstance = resetInstance;
var ExplainableDefenseAI_js_1 = require("./ExplainableDefenseAI.js");
Object.defineProperty(exports, "ExplainableDefenseAI", { enumerable: true, get: function () { return ExplainableDefenseAI_js_1.ExplainableDefenseAI; } });
var resolvers_js_1 = require("./resolvers.js");
Object.defineProperty(exports, "ExplainableDefenseAIResolvers", { enumerable: true, get: function () { return resolvers_js_1.ExplainableDefenseAIResolvers; } });
var xai_integration_js_1 = require("./xai-integration.js");
Object.defineProperty(exports, "UnifiedXAIService", { enumerable: true, get: function () { return xai_integration_js_1.UnifiedXAIService; } });
Object.defineProperty(exports, "unifiedXAI", { enumerable: true, get: function () { return xai_integration_js_1.unifiedXAI; } });
Object.defineProperty(exports, "convertTraceToExplanation", { enumerable: true, get: function () { return xai_integration_js_1.convertTraceToExplanation; } });
Object.defineProperty(exports, "convertExplanationToTrace", { enumerable: true, get: function () { return xai_integration_js_1.convertExplanationToTrace; } });
Object.defineProperty(exports, "createChainNodeFromTrace", { enumerable: true, get: function () { return xai_integration_js_1.createChainNodeFromTrace; } });
const ExplainableDefenseAI_js_2 = require("./ExplainableDefenseAI.js");
// Singleton instance for service integration
let instance = null;
function getExplainableDefenseAI() {
    if (!instance) {
        instance = new ExplainableDefenseAI_js_2.ExplainableDefenseAI('explainable-defense-ai-primary');
    }
    return instance;
}
function resetInstance() {
    instance = null;
}
