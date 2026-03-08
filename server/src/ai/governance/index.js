"use strict";
/**
 * AI-Assisted Governance Module
 *
 * Provides AI-augmented governance features including policy suggestions,
 * verdict explanations, and behavioral anomaly detection.
 *
 * @module ai/governance
 * @version 4.0.0-alpha
 */
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
exports.AIGovernanceService = exports.createBehavioralAnomalyService = exports.BehavioralAnomalyService = exports.createVerdictExplainerService = exports.VerdictExplainerService = exports.createPolicySuggestionService = exports.PolicySuggestionService = void 0;
exports.createAIGovernanceService = createAIGovernanceService;
exports.getAIGovernanceService = getAIGovernanceService;
// Types
__exportStar(require("./types.js"), exports);
// Services
var PolicySuggestionService_js_1 = require("./PolicySuggestionService.js");
Object.defineProperty(exports, "PolicySuggestionService", { enumerable: true, get: function () { return PolicySuggestionService_js_1.PolicySuggestionService; } });
Object.defineProperty(exports, "createPolicySuggestionService", { enumerable: true, get: function () { return PolicySuggestionService_js_1.createPolicySuggestionService; } });
var VerdictExplainerService_js_1 = require("./VerdictExplainerService.js");
Object.defineProperty(exports, "VerdictExplainerService", { enumerable: true, get: function () { return VerdictExplainerService_js_1.VerdictExplainerService; } });
Object.defineProperty(exports, "createVerdictExplainerService", { enumerable: true, get: function () { return VerdictExplainerService_js_1.createVerdictExplainerService; } });
var BehavioralAnomalyService_js_1 = require("./BehavioralAnomalyService.js");
Object.defineProperty(exports, "BehavioralAnomalyService", { enumerable: true, get: function () { return BehavioralAnomalyService_js_1.BehavioralAnomalyService; } });
Object.defineProperty(exports, "createBehavioralAnomalyService", { enumerable: true, get: function () { return BehavioralAnomalyService_js_1.createBehavioralAnomalyService; } });
// Unified AI Governance Service
const PolicySuggestionService_js_2 = require("./PolicySuggestionService.js");
const VerdictExplainerService_js_2 = require("./VerdictExplainerService.js");
const BehavioralAnomalyService_js_2 = require("./BehavioralAnomalyService.js");
/**
 * Unified AI Governance Service
 *
 * Provides a single interface to all AI governance capabilities.
 */
class AIGovernanceService {
    policySuggestions;
    verdictExplainer;
    anomalyDetection;
    constructor(config = {}) {
        this.policySuggestions = (0, PolicySuggestionService_js_2.createPolicySuggestionService)(config);
        this.verdictExplainer = (0, VerdictExplainerService_js_2.createVerdictExplainerService)(config);
        this.anomalyDetection = (0, BehavioralAnomalyService_js_2.createBehavioralAnomalyService)(config);
    }
}
exports.AIGovernanceService = AIGovernanceService;
/**
 * Create a new AI Governance Service instance
 */
function createAIGovernanceService(config = {}) {
    return new AIGovernanceService(config);
}
// Default singleton instance
let defaultInstance = null;
/**
 * Get the default AI Governance Service instance
 */
function getAIGovernanceService() {
    if (!defaultInstance) {
        defaultInstance = createAIGovernanceService();
    }
    return defaultInstance;
}
exports.default = AIGovernanceService;
