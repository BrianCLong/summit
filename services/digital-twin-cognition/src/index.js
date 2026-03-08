"use strict";
// @ts-nocheck
/**
 * Digital Twin Cognition Layer
 *
 * A next-generation cognitive system for digital twins that provides:
 * - Self-learning, multi-modal perception
 * - Multi-paradigm reasoning (causal, probabilistic, counterfactual)
 * - Multi-agent cognition with specialized agents
 * - Real-time decision & control co-pilot
 * - Explainable, governed decisions
 * - Continual learning and adaptation
 *
 * @module @intelgraph/digital-twin-cognition
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
exports.default = exports.ExplainabilityEngine = exports.GovernanceEngine = exports.BaseAgent = exports.AgentOrchestrator = exports.OperationsAgent = exports.ComplianceAgent = exports.OptimizationAgent = exports.DiagnosticsAgent = exports.ContinualLearningSystem = exports.MultiModalPerceptionEngine = exports.TwinCognitionOrchestrator = exports.CognitionEngine = void 0;
exports.createTwinCognition = createTwinCognition;
// Core components
var CognitionEngine_js_1 = require("./core/CognitionEngine.js");
Object.defineProperty(exports, "CognitionEngine", { enumerable: true, get: function () { return CognitionEngine_js_1.CognitionEngine; } });
var TwinCognitionOrchestrator_js_1 = require("./core/TwinCognitionOrchestrator.js");
Object.defineProperty(exports, "TwinCognitionOrchestrator", { enumerable: true, get: function () { return TwinCognitionOrchestrator_js_1.TwinCognitionOrchestrator; } });
// Perception
var MultiModalPerceptionEngine_js_1 = require("./perception/MultiModalPerceptionEngine.js");
Object.defineProperty(exports, "MultiModalPerceptionEngine", { enumerable: true, get: function () { return MultiModalPerceptionEngine_js_1.MultiModalPerceptionEngine; } });
// Learning
var ContinualLearningSystem_js_1 = require("./learning/ContinualLearningSystem.js");
Object.defineProperty(exports, "ContinualLearningSystem", { enumerable: true, get: function () { return ContinualLearningSystem_js_1.ContinualLearningSystem; } });
// Agents
var SpecializedAgents_js_1 = require("./agents/SpecializedAgents.js");
Object.defineProperty(exports, "DiagnosticsAgent", { enumerable: true, get: function () { return SpecializedAgents_js_1.DiagnosticsAgent; } });
Object.defineProperty(exports, "OptimizationAgent", { enumerable: true, get: function () { return SpecializedAgents_js_1.OptimizationAgent; } });
Object.defineProperty(exports, "ComplianceAgent", { enumerable: true, get: function () { return SpecializedAgents_js_1.ComplianceAgent; } });
Object.defineProperty(exports, "OperationsAgent", { enumerable: true, get: function () { return SpecializedAgents_js_1.OperationsAgent; } });
Object.defineProperty(exports, "AgentOrchestrator", { enumerable: true, get: function () { return SpecializedAgents_js_1.AgentOrchestrator; } });
Object.defineProperty(exports, "BaseAgent", { enumerable: true, get: function () { return SpecializedAgents_js_1.BaseAgent; } });
// Governance
var GovernanceEngine_js_1 = require("./governance/GovernanceEngine.js");
Object.defineProperty(exports, "GovernanceEngine", { enumerable: true, get: function () { return GovernanceEngine_js_1.GovernanceEngine; } });
// Explainability
var ExplainabilityEngine_js_1 = require("./explainability/ExplainabilityEngine.js");
Object.defineProperty(exports, "ExplainabilityEngine", { enumerable: true, get: function () { return ExplainabilityEngine_js_1.ExplainabilityEngine; } });
// Types
__exportStar(require("./types/index.js"), exports);
// Factory function for quick setup
function createTwinCognition(config) {
    return new TwinCognitionOrchestrator(config);
}
// Default export
var TwinCognitionOrchestrator_js_2 = require("./core/TwinCognitionOrchestrator.js");
Object.defineProperty(exports, "default", { enumerable: true, get: function () { return TwinCognitionOrchestrator_js_2.TwinCognitionOrchestrator; } });
