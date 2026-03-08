"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.llmRouter = void 0;
exports.createLLMRouter = createLLMRouter;
const router_js_1 = require("./router.js");
const openai_js_1 = require("./providers/openai.js");
const mock_js_1 = require("./providers/mock.js");
const nvidia_nim_js_1 = require("./providers/nvidia-nim.js");
const index_js_1 = require("./policies/index.js");
const safety_js_1 = require("./safety.js");
const config_js_1 = require("./config.js");
function createLLMRouter(config = config_js_1.defaultConfig) {
    const providers = [];
    if (config.providers.mock.enabled) {
        providers.push(new mock_js_1.MockProvider());
    }
    if (config.providers.openai.enabled && config.providers.openai.apiKey) {
        providers.push(new openai_js_1.OpenAIProvider(config.providers.openai.apiKey));
    }
    if (config.providers.nvidiaNim.enabled && config.providers.nvidiaNim.apiKey) {
        providers.push(new nvidia_nim_js_1.NvidiaNimProvider({
            apiKey: config.providers.nvidiaNim.apiKey,
            baseUrl: config.providers.nvidiaNim.baseUrl,
            model: config.providers.nvidiaNim.model,
            modeDefault: config.providers.nvidiaNim.modeDefault,
            enableMultimodal: config.providers.nvidiaNim.enableMultimodal
        }));
    }
    const policies = [];
    if (config.policies.costControl.enabled) {
        policies.push(new index_js_1.CostControlPolicy(config.policies.costControl.maxCostPerRequest));
    }
    if (config.policies.latencyOptimization.enabled) {
        policies.push(new index_js_1.LatencyPolicy());
    }
    const guardrails = [];
    if (config.guardrails.piiRedaction.enabled) {
        guardrails.push(new safety_js_1.PIIGuardrail());
    }
    return new router_js_1.LLMRouter({
        providers,
        policies,
        guardrails,
        cacheTTL: config.cache.enabled ? config.cache.ttlMs : 0,
        logDir: config.logging.enabled ? config.logging.logDir : undefined
    });
}
// Default instance
exports.llmRouter = createLLMRouter();
__exportStar(require("./types.js"), exports);
__exportStar(require("./router.js"), exports);
__exportStar(require("./errors.js"), exports);
__exportStar(require("./config.js"), exports);
