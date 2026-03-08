"use strict";
/**
 * @intelgraph/supply-chain-ai
 *
 * Advanced AI/ML intelligence engine with deep learning forecasting,
 * computer vision quality inspection, NLP contract analysis, reinforcement
 * learning optimization, causal inference, and explainable AI.
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
exports.aiEngine = exports.AIIntelligenceEngine = void 0;
__exportStar(require("./types"), exports);
__exportStar(require("./AIIntelligenceEngine"), exports);
var AIIntelligenceEngine_1 = require("./AIIntelligenceEngine");
Object.defineProperty(exports, "AIIntelligenceEngine", { enumerable: true, get: function () { return AIIntelligenceEngine_1.AIIntelligenceEngine; } });
Object.defineProperty(exports, "aiEngine", { enumerable: true, get: function () { return AIIntelligenceEngine_1.aiEngine; } });
